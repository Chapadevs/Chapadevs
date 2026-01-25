import AIPreview from '../models/AIPreview.js'
import Project from '../models/Project.js'
import asyncHandler from 'express-async-handler'
import vertexAIService from '../services/vertexAIService.js'
import costMonitor from '../middleware/costMonitoring.js'

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
    // Generate both text analysis and website preview
    const userInputs = { budget, timeline, techStack, projectType }
    
    // Generate text analysis
    const { result, fromCache } = await vertexAIService.generateProjectAnalysis(prompt, userInputs)

    // Track API call or cache hit for text analysis
    if (fromCache) {
      costMonitor.trackCacheHit()
    } else {
      costMonitor.trackAPICall()
    }

    // Generate website preview
    let websitePreview = null
    let websiteFromCache = false
    let websiteIsMock = false
    
    try {
      const websiteResult = await vertexAIService.generateWebsitePreview(prompt, userInputs)
      websitePreview = websiteResult.htmlCode
      websiteFromCache = websiteResult.fromCache
      websiteIsMock = websiteResult.isMock === true
      
      // Track API call or cache hit for website (mocks are not counted)
      if (websiteIsMock) {
        // no track — mock uses no API
      } else if (websiteFromCache) {
        costMonitor.trackCacheHit()
      } else {
        costMonitor.trackAPICall()
      }
    } catch (websiteError) {
      console.error('Website preview generation failed:', websiteError)
      // Continue even if website preview fails
    }

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const textTokens = Math.ceil(result.length / 4)
    const websiteTokens = websitePreview ? Math.ceil(websitePreview.length / 4) : 0
    const estimatedTokens = textTokens + websiteTokens

    // Update preview with result
    preview.previewResult = result
    preview.status = 'completed'
    preview.tokenUsage = estimatedTokens
    if (websitePreview) {
      preview.metadata = { 
        ...preview.metadata, 
        websitePreviewCode: websitePreview 
      }
    }
    await preview.save()

    res.status(201).json({
      id: preview._id,
      prompt: preview.prompt,
      previewType: preview.previewType,
      status: 'completed',
      result: result,
      websitePreview: websitePreview ? { htmlCode: websitePreview, isMock: websiteIsMock } : null,
      fromCache: fromCache && websiteFromCache,
      websiteIsMock: websiteIsMock,
      tokenUsage: estimatedTokens,
      message: (fromCache && websiteFromCache) ? 'Results retrieved from cache' : 'AI preview generated successfully'
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