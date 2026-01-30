import AIPreview from '../models/AIPreview.js'
import Project from '../models/Project.js'
import User from '../models/User.js'
import asyncHandler from 'express-async-handler'
import vertexAIService from '../services/vertexAIService.js'
import costMonitor from '../middleware/costMonitoring.js'

const ESTIMATED_TOKENS_PER_REQUEST = 20000

// @desc    Generate AI preview
// @route   POST /api/ai-previews
// @access  Private
export const generateAIPreview = asyncHandler(async (req, res) => {
  const { prompt, projectId, previewType, budget, timeline, techStack, projectType } = req.body

  if (!prompt) {
    res.status(400)
    throw new Error('Please provide a prompt for the AI preview')
  }

  // Track request
  costMonitor.trackRequest()

  // Rate limiting: Check user's recent requests
  const oneHourAgo = new Date(Date.now() - 3600000)
  const recentPreviews = await AIPreview.countDocuments({
    userId: req.user._id,
    createdAt: { $gte: oneHourAgo }
  })

  // Higher limit in development for testing
  const rateLimit = process.env.NODE_ENV === 'development' ? 20 : 5

  if (recentPreviews >= rateLimit) {
    res.status(429)
    throw new Error(`Rate limit exceeded: Maximum ${rateLimit} AI generations per hour. Please try again later.`)
  }

  const u = await User.findById(req.user._id).select('aiTokenLimitMonthly').lean()
  const userLimit = u?.aiTokenLimitMonthly ?? null
  const defaultLimit = process.env.AI_TOKEN_LIMIT_MONTHLY_DEFAULT
  const limit = userLimit ?? (defaultLimit ? parseInt(defaultLimit, 10) : null)
  const limitNum = Number.isFinite(limit) ? limit : null
  if (limitNum != null) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const agg = await AIPreview.aggregate([
      { $match: { userId: req.user._id, status: 'completed', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$tokenUsage' } } },
    ])
    const currentUsage = agg[0]?.total ?? 0
    if (currentUsage + ESTIMATED_TOKENS_PER_REQUEST > limitNum) {
      res.status(429)
      throw new Error(`Monthly AI token limit reached (${limitNum} tokens). Used ${currentUsage} this month.`)
    }
  }

  if (projectId) {
    const project = await Project.findById(projectId)
    if (!project || project.clientId.toString() !== req.user._id.toString()) {
      res.status(403)
      throw new Error('Not authorized to generate preview for this project')
    }
  }

  // Create preview record
  const preview = await AIPreview.create({
    userId: req.user._id,
    projectId: projectId || null,
    prompt,
    previewType: previewType || 'text',
    previewResult: '',
    status: 'generating',
    metadata: { budget, timeline, techStack, projectType }
  })

  try {
    const userInputs = { budget, timeline, techStack, projectType }
    
    const { result, fromCache, usage: usageAnalysis } = await vertexAIService.generateProjectAnalysis(prompt, userInputs)

    if (fromCache) costMonitor.trackCacheHit()
    else costMonitor.trackAPICall()

    let websitePreview = null
    let websiteFromCache = false
    let websiteIsMock = false
    let usageWebsite = null

    try {
      const websiteResult = await vertexAIService.generateWebsitePreview(prompt, userInputs)
      websitePreview = websiteResult.htmlCode
      websiteFromCache = websiteResult.fromCache
      websiteIsMock = websiteResult.isMock === true
      usageWebsite = websiteResult.usage ?? null

      if (websiteIsMock) { /* no track */ } else if (websiteFromCache) costMonitor.trackCacheHit()
      else costMonitor.trackAPICall()
    } catch (websiteError) {
      console.error('Website preview generation failed:', websiteError)
    }

    const totalTokenCount = [usageAnalysis, usageWebsite]
      .filter(Boolean)
      .reduce((sum, u) => sum + (u.totalTokenCount ?? 0), 0)
    const estimatedTokens = totalTokenCount > 0
      ? totalTokenCount
      : Math.ceil(result.length / 4) + (websitePreview ? Math.ceil(websitePreview.length / 4) : 0)

    preview.previewResult = result
    preview.status = 'completed'
    preview.tokenUsage = estimatedTokens
    preview.metadata = {
      ...preview.metadata,
      ...(websitePreview && { websitePreviewCode: websitePreview }),
      usage: {
        analysis: usageAnalysis ? { promptTokenCount: usageAnalysis.promptTokenCount, candidatesTokenCount: usageAnalysis.candidatesTokenCount, totalTokenCount: usageAnalysis.totalTokenCount } : null,
        website: usageWebsite ? { promptTokenCount: usageWebsite.promptTokenCount, candidatesTokenCount: usageWebsite.candidatesTokenCount, totalTokenCount: usageWebsite.totalTokenCount } : null,
      },
    }
    await preview.save()

    const usagePayload = {
      analysis: usageAnalysis,
      website: usageWebsite,
      totalTokenCount: estimatedTokens,
    }

    res.status(201).json({
      id: preview._id,
      prompt: preview.prompt,
      previewType: preview.previewType,
      status: 'completed',
      result,
      websitePreview: websitePreview ? { htmlCode: websitePreview, isMock: websiteIsMock } : null,
      fromCache: fromCache && websiteFromCache,
      websiteIsMock,
      tokenUsage: estimatedTokens,
      usage: usagePayload,
      message: (fromCache && websiteFromCache) ? 'Results retrieved from cache' : 'AI preview generated successfully',
    })

  } catch (error) {
    costMonitor.trackError()
    
    // Update preview with error
    preview.status = 'failed'
    preview.previewResult = error.message
    await preview.save()
    
    res.status(500)
    throw new Error(`AI generation failed: ${error.message}`)
  }
})

// @desc    Get AI usage for current user
// @route   GET /api/ai-previews/usage
// @access  Private
export const getAIPreviewUsage = asyncHandler(async (req, res) => {
  const period = (req.query.period || 'month').toLowerCase()
  const isWeek = period === 'week'
  const start = new Date()
  if (isWeek) start.setDate(start.getDate() - 7)
  else start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const previews = await AIPreview.find({
    userId: req.user._id,
    status: 'completed',
    createdAt: { $gte: start },
  })
    .select('tokenUsage metadata.usage createdAt')
    .sort({ createdAt: -1 })
    .lean()

  const totalRequests = previews.length
  const totalTokenCount = previews.reduce((sum, p) => sum + (p.tokenUsage || 0), 0)
  let totalPromptTokens = 0
  let totalOutputTokens = 0
  for (const p of previews) {
    const u = p.metadata?.usage
    if (u?.analysis) {
      totalPromptTokens += u.analysis.promptTokenCount || 0
      totalOutputTokens += u.analysis.candidatesTokenCount || 0
    }
    if (u?.website) {
      totalPromptTokens += u.website.promptTokenCount || 0
      totalOutputTokens += u.website.candidatesTokenCount || 0
    }
  }

  res.json({
    period: isWeek ? 'week' : 'month',
    totalRequests,
    totalTokenCount,
    totalPromptTokens,
    totalOutputTokens,
    byPreview: previews.map((p) => ({
      id: p._id,
      createdAt: p.createdAt,
      tokenUsage: p.tokenUsage,
    })),
  })
})

// @desc    Get all AI previews for current user
// @route   GET /api/ai-previews
// @access  Private
export const getAIPreviews = asyncHandler(async (req, res) => {
  const previews = await AIPreview.find({ userId: req.user._id })
    .populate('projectId', 'title status')
    .sort({ createdAt: -1 })

  res.json(previews)
})

// @desc    Get AI preview by ID
// @route   GET /api/ai-previews/:id
// @access  Private
export const getAIPreviewById = asyncHandler(async (req, res) => { 
  const preview = await AIPreview.findById(req.params.id).populate( 
    'projectId',
    'title status'
  )
  
  if (!preview) {
    res.status(404)
    throw new Error('AI preview not found')
  }

  if (
    preview.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403)
    throw new Error('Not authorized to view this preview')
  }

  res.json(preview)
})

// @desc    Delete AI preview
// @route   DELETE /api/ai-previews/:id
// @access  Private
export const deleteAIPreview = asyncHandler(async (req, res) => {
  const preview = await AIPreview.findById(req.params.id)

  if (!preview) {
    res.status(404)
    throw new Error('AI preview not found')
  }

  if (
    preview.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403)
    throw new Error('Not authorized to delete this preview')
  }

  await preview.deleteOne()

  res.json({ message: 'AI preview deleted successfully' })
})