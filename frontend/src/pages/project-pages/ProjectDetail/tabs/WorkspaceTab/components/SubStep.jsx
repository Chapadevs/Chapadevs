import { useState } from 'react'
import { Button, Input, Textarea } from '../../../../../../components/ui-components'
import './SubStep.css'

const SubStep = ({ subStep, canEdit, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(subStep.title || '')
  const [notes, setNotes] = useState(subStep.notes || '')
  const [completed, setCompleted] = useState(subStep.completed || false)

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        title,
        notes,
        completed,
        order: subStep.order,
      })
    }
    setIsEditing(false)
  }

  const handleToggleComplete = () => {
    if (canEdit && onUpdate) {
      const newCompleted = !completed
      setCompleted(newCompleted)
      onUpdate({
        ...subStep,
        completed: newCompleted,
      })
    }
  }

  if (isEditing && canEdit) {
    return (
      <div className="substep-item substep-editing">
        <Input
          type="text"
          className="substep-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sub-step title"
        />
        <Textarea
          className="substep-notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
        />
        <div className="substep-actions">
          <Button type="button" variant="primary" size="sm" className="btn btn-primary btn-sm" onClick={handleSave}>
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setIsEditing(false)
              setTitle(subStep.title || '')
              setNotes(subStep.notes || '')
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`substep-item ${completed ? 'completed' : ''}`}>
      <div className="substep-header">
        <label className="substep-checkbox-label">
          <input
            type="checkbox"
            checked={completed}
            onChange={handleToggleComplete}
            disabled={!canEdit}
            className="substep-checkbox"
          />
          <span className="substep-title">{subStep.title || 'Untitled sub-step'}</span>
        </label>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            className="substep-edit-btn"
            onClick={() => setIsEditing(true)}
            aria-label="Edit sub-step"
          >
            ✎
          </Button>
        )}
      </div>
      {subStep.notes && (
        <div className="substep-notes">{subStep.notes}</div>
      )}
    </div>
  )
}

export default SubStep
