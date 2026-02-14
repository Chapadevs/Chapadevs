import { useState, useEffect } from 'react'
import { Button, Textarea } from '../../ui-components'
import './ClientQuestion.css'

const ClientQuestion = ({ question, canAnswer, onAnswer }) => {
  const [answer, setAnswer] = useState(question.answer || '')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setAnswer(question.answer || '')
    setIsEditing(false)
  }, [question])

  const handleSave = () => {
    if (onAnswer) {
      onAnswer(answer)
    }
    setIsEditing(false)
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
            <Button type="button" variant="primary" size="sm" className="btn btn-primary btn-sm" onClick={handleSave}>
              Save
            </Button>
            <Button type="button" variant="secondary" size="sm" className="btn btn-secondary btn-sm" onClick={handleCancel}>
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
