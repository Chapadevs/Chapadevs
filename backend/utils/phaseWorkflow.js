import ProjectPhase from '../models/ProjectPhase.js'

/**
 * Phase workflow utilities for managing phase progression and requirements
 */

/**
 * Check if all requirements are met to proceed to the next phase
 * @param {string} projectId - Project ID
 * @param {string} currentPhaseId - Current phase ID
 * @returns {Promise<{canProceed: boolean, reasons: string[]}>}
 */
export async function canProceedToNextPhase(projectId, currentPhaseId) {
  const currentPhase = await ProjectPhase.findOne({
    _id: currentPhaseId,
    projectId,
  }).lean()

  if (!currentPhase) {
    return { canProceed: false, reasons: ['Current phase not found'] }
  }

  const reasons = []

  // Phase must be completed
  if (currentPhase.status !== 'completed') {
    reasons.push('Current phase is not completed')
  }

  // If phase requires client approval, it must be approved
  if (currentPhase.requiresClientApproval && !currentPhase.clientApproved) {
    reasons.push('Client approval is required')
  }

  // All required questions must be answered
  const requiredQuestions = currentPhase.clientQuestions?.filter((q) => q.required) || []
  const unansweredRequired = requiredQuestions.filter((q) => !q.answer || q.answer.trim() === '')
  if (unansweredRequired.length > 0) {
    reasons.push(`${unansweredRequired.length} required question(s) not answered`)
  }

  // All sub-steps should be completed (optional check)
  const incompleteSubSteps = currentPhase.subSteps?.filter((s) => !s.completed) || []
  if (incompleteSubSteps.length > 0) {
    reasons.push(`${incompleteSubSteps.length} sub-step(s) not completed`)
  }

  return {
    canProceed: reasons.length === 0,
    reasons,
  }
}

/**
 * Get phase requirements summary
 * @param {Object} phase - Phase object
 * @returns {Object} Requirements summary
 */
export function getPhaseRequirements(phase) {
  const requiredQuestions = phase.clientQuestions?.filter((q) => q.required) || []
  const answeredRequired = requiredQuestions.filter((q) => q.answer && q.answer.trim() !== '').length
  const subSteps = phase.subSteps || []
  const completedSubSteps = subSteps.filter((s) => s.completed).length

  return {
    requiresApproval: phase.requiresClientApproval || false,
    isApproved: phase.clientApproved || false,
    requiredQuestions: {
      total: requiredQuestions.length,
      answered: answeredRequired,
      unanswered: requiredQuestions.length - answeredRequired,
    },
    subSteps: {
      total: subSteps.length,
      completed: completedSubSteps,
      incomplete: subSteps.length - completedSubSteps,
    },
    isComplete: phase.status === 'completed',
  }
}

/**
 * Check if phase requires client approval based on phase type
 * @param {Object} phase - Phase object
 * @returns {boolean}
 */
export function checkClientApprovalRequired(phase) {
  // If already set, use that value
  if (phase.requiresClientApproval !== undefined) {
    return phase.requiresClientApproval
  }

  // Default logic: Design and Launch phases typically need approval
  const title = (phase.title || '').toLowerCase()
  const approvalKeywords = ['design', 'launch', 'approval', 'review', 'handoff']
  return approvalKeywords.some((keyword) => title.includes(keyword))
}

/**
 * Calculate actual duration of a phase in days
 * @param {Object} phase - Phase object
 * @returns {number|null} Duration in days, or null if phase not started/completed
 */
export function calculatePhaseDuration(phase) {
  if (!phase.startedAt) {
    return null
  }

  const endDate = phase.completedAt || new Date()
  const diffTime = Math.abs(endDate - new Date(phase.startedAt))
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Get default questions for a phase based on phase title
 * @param {string} phaseTitle - Phase title
 * @returns {Array<{question: string, required: boolean, order: number}>}
 */
export function getDefaultQuestionsForPhase(phaseTitle) {
  const title = (phaseTitle || '').toLowerCase()
  const questions = []

  if (title.includes('design')) {
    questions.push(
      {
        question: 'Do you approve the design mockups?',
        required: true,
        order: 1,
      },
      {
        question: 'Are there any color or style changes you would like?',
        required: false,
        order: 2,
      },
      {
        question: 'Does the design match your brand guidelines?',
        required: false,
        order: 3,
      }
    )
  } else if (title.includes('development') || title.includes('build')) {
    questions.push(
      {
        question: 'Are the features working as expected?',
        required: true,
        order: 1,
      },
      {
        question: 'Have you noticed any bugs or issues?',
        required: false,
        order: 2,
      },
      {
        question: 'Does the functionality meet your requirements?',
        required: false,
        order: 3,
      }
    )
  } else if (title.includes('testing') || title.includes('qa')) {
    questions.push(
      {
        question: 'Have you tested all the features?',
        required: true,
        order: 1,
      },
      {
        question: 'Are there any issues that need to be fixed?',
        required: false,
        order: 2,
      }
    )
  } else if (title.includes('launch') || title.includes('handoff')) {
    questions.push(
      {
        question: 'Is the site ready for launch?',
        required: true,
        order: 1,
      },
      {
        question: 'Are there any final changes needed before going live?',
        required: false,
        order: 2,
      },
      {
        question: 'Do you have all the necessary credentials and documentation?',
        required: false,
        order: 3,
      }
    )
  } else if (title.includes('planning') || title.includes('discovery')) {
    questions.push(
      {
        question: 'Do you have any additional requirements or changes?',
        required: false,
        order: 1,
      },
      {
        question: 'Is the project scope clear and agreed upon?',
        required: true,
        order: 2,
      }
    )
  }

  // If no specific questions, add a generic one
  if (questions.length === 0) {
    questions.push({
      question: 'Do you have any feedback or questions about this phase?',
      required: false,
      order: 1,
    })
  }

  return questions
}
