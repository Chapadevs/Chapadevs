import { useState, useEffect, useRef } from 'react'
import { Button, Textarea } from '../../../../../../components/ui-components'
import './ClientQuestion.css'

const ClientQuestion = ({ question, canAnswer, onAnswer }) => {
  const [answer, setAnswer] = useState(question.answer || '')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const questionIdRef = useRef(question.order ?? question._id ?? question.question)

  useEffect(() => {
    const questionId = question.order ?? question._id ?? question.question
    const isDifferentQuestion = questionIdRef.current !== questionId
    questionIdRef.current = questionId

    setAnswer(question.answer || '')

    if (isDifferentQuestion) {
      setIsEditing(false)
    }
  }, [question.order, question._id, question.question, question.answer])

  const handleSave = async () => {
    if (!onAnswer) {
      setIsEditing(false)
      return
    }
    try {
      setSaving(true)
      const result = onAnswer(answer)
      if (result && typeof result.then === 'function') {
        await result
      }
      setIsEditing(false)
    } catch (_) {
      // Error shown by parent
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setAnswer(question.answer || '')
    setIsEditing(false)
  }

  if (!canAnswer && !question.answer) {
    return null // Don't show unanswered questions to non-clients
  }

  return (
    <div className={`client-question-item ${question.required ? 'required' : ''}`}>
      <div className="question-header">
        <label className="question-label">
          {question.question}
          {question.required && <span className="required-indicator">*</span>}
        </label>
      </div>

      {isEditing && canAnswer ? (
        <div className="question-answer-edit">
          <Textarea
            className="question-answer-input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
            rows={3}
          />
          <div className="question-actions">
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="question-answer-display">
          {question.answer ? (
            <div className="answer-text">{question.answer}</div>
          ) : (
            <div className="answer-placeholder">No answer yet</div>
          )}
          {canAnswer && (
            <Button
              type="button"
              variant="ghost"
              className="question-edit-btn"
              onClick={() => setIsEditing(true)}
            >
              {question.answer ? 'Edit' : 'Answer'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default ClientQuestion
