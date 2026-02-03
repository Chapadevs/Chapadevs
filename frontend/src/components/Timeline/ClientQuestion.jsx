import { useState, useEffect } from 'react'
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
          <textarea
            className="question-answer-input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
            rows={3}
          />
          <div className="question-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
              Save
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancel}>
              Cancel
            </button>
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
            <button
              type="button"
              className="question-edit-btn"
              onClick={() => setIsEditing(true)}
            >
              {question.answer ? 'Edit' : 'Answer'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ClientQuestion
