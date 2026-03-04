import { useState, useEffect, useRef } from 'react'
import { Button, Textarea } from '../../../../../../components/ui-components'

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

  const creatorName =
    question.createdBy && typeof question.createdBy === 'object' && question.createdBy.name
      ? question.createdBy.name
      : null

  return (
    <div className="p-4 border border-border bg-surface">
      <div className="flex items-start justify-between gap-2 mb-2">
        <label className="block font-body text-sm text-ink flex-1">{question.question}</label>
        {creatorName && (
          <span className="font-body text-xs text-ink-muted shrink-0">
            Added by {creatorName}
          </span>
        )}
      </div>

      {isEditing && canAnswer ? (
        <div className="flex flex-col gap-3">
          <Textarea
            className="w-full p-3 resize-y min-h-[80px] border border-border rounded-none font-body"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 font-body text-sm text-ink-secondary">
            {question.answer ? (
              <span className="whitespace-pre-wrap">{question.answer}</span>
            ) : (
              <span className="text-ink-muted">No answer yet</span>
            )}
          </div>
          {canAnswer && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 py-1 px-2 text-xs"
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
