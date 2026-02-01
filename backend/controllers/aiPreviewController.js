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
  const { prompt, projectId, previewType, budget, timeline, techStack, projectType, modelId } = req.body

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
    // Per-project limit: max 5 completed previews per project
    const projectPreviewCount = await AIPreview.countDocuments({
      projectId,
      status: 'completed'
    })
    if (projectPreviewCount >= 5) {
      res.status(400)
      throw new Error('This project already has 5 AI previews. Delete one to generate another.')
    }
  }

  // Use provided modelId or default to gemini-2.0-flash
  const selectedModelId = modelId || 'gemini-2.0-flash'

  // Create preview record
  const preview = await AIPreview.create({
    userId: req.user._id,
    projectId: projectId || null,
    prompt,
    previewType: previewType || 'text',
    previewResult: '',
    status: 'generating',
    metadata: { budget, timeline, techStack, projectType, modelId: selectedModelId }
  })

  try {
    const userInputs = { budget, timeline, techStack, projectType }
    
    // Use combined preview generation (single API call)
    const { result, fromCache, usage, isMock } = await vertexAIService.generateCombinedPreview(
      prompt, 
      userInputs, 
      selectedModelId
    )

    if (fromCache) {
      costMonitor.trackCacheHit()
    } else if (!isMock) {
      costMonitor.trackAPICall()
    }

    // Extract analysis and code from combined result
    const analysis = result.analysis || {}
    const code = result.code || ''

    // Convert analysis to JSON string for storage
    const analysisJson = JSON.stringify(analysis)

    const totalTokenCount = usage?.totalTokenCount ?? 0
    const estimatedTokens = totalTokenCount > 0
      ? totalTokenCount
      : Math.ceil(analysisJson.length / 4) + Math.ceil(code.length / 4)

    preview.previewResult = analysisJson
    preview.status = 'completed'
    preview.tokenUsage = estimatedTokens
    preview.metadata = {
      ...preview.metadata,
      websitePreviewCode: code,
      usage: usage ? {
        combined: {
          promptTokenCount: usage.promptTokenCount || 0,
          candidatesTokenCount: usage.candidatesTokenCount || 0,
          totalTokenCount: usage.totalTokenCount || 0
        }
      } : null,
    }
    await preview.save()

    const usagePayload = {
      combined: usage,
      totalTokenCount: estimatedTokens,
    }

    res.status(201).json({
      id: preview._id,
      prompt: preview.prompt,
      previewType: preview.previewType,
      status: 'completed',
      result: analysis,
      websitePreview: code ? { htmlCode: code, isMock: isMock === true } : null,
      fromCache: fromCache === true,
      websiteIsMock: isMock === true,
      tokenUsage: estimatedTokens,
      usage: usagePayload,
      message: fromCache ? 'Results retrieved from cache' : 'AI preview generated successfully',
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

// @desc    Regenerate AI preview with styling modifications
// @route   POST /api/ai-previews/:id/regenerate
// @access  Private
export const regenerateAIPreview = asyncHandler(async (req, res) => {
  const { modifications, modelId } = req.body

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
    throw new Error('Not authorized to regenerate this preview')
  }

  if (preview.status !== 'completed') {
    res.status(400)
    throw new Error('Can only regenerate completed previews')
  }

  // Get cached code from metadata
  const cachedCode = preview.metadata?.websitePreviewCode
  if (!cachedCode) {
    res.status(400)
    throw new Error('No cached code found for regeneration')
  }

  // Use provided modelId or default to gemini-2.0-flash
  const selectedModelId = modelId || 'gemini-2.0-flash'

  try {
    const { htmlCode, usage } = await vertexAIService.regenerateWithContext(
      cachedCode,
      modifications || 'Change color scheme and adjust spacing for a fresh look',
      selectedModelId
    )

    if (!usage) {
      costMonitor.trackCacheHit()
    } else {
      costMonitor.trackAPICall()
    }

    // Update preview with new code
    preview.metadata = {
      ...preview.metadata,
      websitePreviewCode: htmlCode,
      modelId: selectedModelId,
      lastRegenerated: new Date(),
    }
    
    const tokenUsage = usage?.totalTokenCount ?? Math.ceil(htmlCode.length / 4)
    preview.tokenUsage = (preview.tokenUsage || 0) + tokenUsage
    await preview.save()

    res.status(200).json({
      id: preview._id,
      websitePreview: { htmlCode, isMock: false },
      tokenUsage: tokenUsage,
      usage: usage ? {
        regenerate: {
          promptTokenCount: usage.promptTokenCount || 0,
          candidatesTokenCount: usage.candidatesTokenCount || 0,
          totalTokenCount: usage.totalTokenCount || 0
        }
      } : null,
      message: 'Preview regenerated successfully',
    })

  } catch (error) {
    costMonitor.trackError()
    res.status(500)
    throw new Error(`Regeneration failed: ${error.message}`)
  }
})