import { useState } from 'react'
import { projectAPI } from '../../services/api'
import './AttachmentManager.css'

const AttachmentManager = ({
  phase,
  project,
  user,
  isClientOwner,
  isAssignedProgrammer,
  onUpdate,
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const canUpload = isAssignedProgrammer || isClientOwner || user?.role === 'admin'
  const attachments = phase.attachments || []

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const updated = await projectAPI.uploadAttachment(
        project._id || project.id,
        phase._id || phase.id,
        formData
      )

      if (onUpdate) {
        onUpdate(updated)
      }

      // Reset file input
      e.target.value = ''
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return
    }

    try {
      setDeletingId(attachmentId)
      setError(null)

      const updated = await projectAPI.deleteAttachment(
        project._id || project.id,
        phase._id || phase.id,
        attachmentId
      )

      if (onUpdate) {
        onUpdate(updated)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete attachment')
    } finally {
      setDeletingId(null)
    }
  }

  const getFileIcon = (type) => {
    if (!type) return '📄'
    if (type.includes('image')) return '🖼️'
    if (type.includes('pdf')) return '📕'
    if (type.includes('word') || type.includes('document')) return '📝'
    if (type.includes('zip') || type.includes('archive')) return '📦'
    return '📄'
  }

  const getFileUrl = (url) => {
    if (url.startsWith('http')) return url
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
    return `${backendUrl.replace('/api', '')}${url}`
  }

  return (
    <div className="attachment-manager">
      {error && <div className="error-message">{error}</div>}

      {canUpload && (
        <div className="attachment-upload">
          <label className="attachment-upload-label">
            <input
              type="file"
              onChange={handleFileSelect}
              disabled={uploading}
              className="attachment-upload-input"
            />
            <span className="attachment-upload-button">
              {uploading ? 'Uploading...' : '+ Upload File'}
            </span>
          </label>
          <p className="attachment-upload-hint">Max file size: 10MB</p>
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="empty-state">No attachments yet.</p>
      ) : (
        <div className="attachments-list">
          {attachments.map((attachment) => {
            const attachmentId = attachment._id || attachment.id
            const canDelete =
              (attachment.uploadedBy?.toString() === (user?._id || user?.id)?.toString()) ||
              isAssignedProgrammer ||
              user?.role === 'admin'

            return (
              <div key={attachmentId} className="attachment-item">
                <div className="attachment-icon">{getFileIcon(attachment.type)}</div>
                <div className="attachment-info">
                  <div className="attachment-filename">{attachment.filename}</div>
                  <div className="attachment-meta">
                    {attachment.uploadedAt &&
                      `Uploaded ${new Date(attachment.uploadedAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="attachment-actions">
                  <a
                    href={getFileUrl(attachment.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="attachment-download-btn"
                    download
                  >
                    Download
                  </a>
                  {canDelete && (
                    <button
                      type="button"
                      className="attachment-delete-btn"
                      onClick={() => handleDelete(attachmentId)}
                      disabled={deletingId === attachmentId}
                    >
                      {deletingId === attachmentId ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AttachmentManager
