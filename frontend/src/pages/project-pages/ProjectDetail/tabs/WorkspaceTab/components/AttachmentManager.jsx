import { useState, useEffect } from 'react'
import { Download, RefreshCw, Trash2 } from 'lucide-react'
import { projectAPI } from '../../../../../../services/api'
import { Button, Alert, Badge } from '../../../../../../components/ui-components'
import { isGcsUrl, getFileIcon, getFileUrl, isImage } from '../../../utils/attachmentUtils'

function ImageWithFallback({ src, alt, fallbackIcon }) {
  const [errored, setErrored] = useState(false)
  useEffect(() => setErrored(false), [src])
  if (errored) {
    return (
      <span className="absolute inset-0 flex items-center justify-center text-lg bg-muted" aria-hidden>
        {fallbackIcon}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 size-full object-cover"
      onError={() => setErrored(true)}
    />
  )
}

const AttachmentManager = ({
  phase,
  project,
  canUpload,
  isProgrammerOrAdmin,
  userId,
  onUpdate,
  compact = false,
  showUploadSection = true,
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [signedUrls, setSignedUrls] = useState({})

  const attachments = phase.attachments || []

  useEffect(() => {
    const gcsImageUrls = attachments
      .filter((a) => isGcsUrl(a.url) && a.type && String(a.type).includes('image'))
      .map((a) => a.url)
    if (gcsImageUrls.length === 0 || !project?._id || !phase?._id) return
    projectAPI
      .getAttachmentSignedUrls(project._id || project.id, phase._id || phase.id, gcsImageUrls)
      .then(({ urls }) => {
        const map = {}
        gcsImageUrls.forEach((orig, i) => {
          map[orig] = urls[i] || orig
        })
        setSignedUrls(map)
      })
      .catch(() => {})
  }, [attachments, project?._id, phase?._id])
  const userIdStr = userId?.toString?.() ?? ''

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

  const handleUpdateAttachmentStatus = async (attachmentId, status, changesNeededFeedback = null) => {
    try {
      setUpdatingStatusId(attachmentId)
      setError(null)
      const updated = await projectAPI.updateAttachment(
        project._id || project.id,
        phase._id || phase.id,
        attachmentId,
        { status, changesNeededFeedback }
      )
      if (onUpdate) onUpdate(updated)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update attachment status')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const sortedAttachments = [...attachments].sort((a, b) => {
    const aImg = isImage(a.type)
    const bImg = isImage(b.type)
    if (aImg && !bImg) return -1
    if (!aImg && bImg) return 1
    return 0
  })

  return (
    <div className={compact ? 'flex flex-col gap-1.5' : 'flex flex-col gap-4'}>
      {error && <Alert variant="error">{error}</Alert>}

      {showUploadSection && (canUpload || attachments.length === 0) ? (
        <div className={compact ? 'pt-2 px-2 pb-0 text-center' : 'p-4 text-center'}>
          {canUpload && (
            <p className={`text-muted-foreground font-body ${compact ? 'text-[0.65rem] mb-1' : 'text-xs mb-2'}`}>Max file size: 10MB</p>
          )}
          {canUpload && (
          <label className="inline-block cursor-pointer">
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <span className={`inline-block font-button bg-primary text-white rounded-none hover:opacity-90 transition-opacity ${compact ? 'px-3 py-1.5 text-xs' : 'px-6 py-3'}`}>
              {uploading ? 'Uploading...' : '+ Upload File'}
            </span>
          </label>
          )}
          {attachments.length === 0 && (
            <p className={`text-muted-foreground font-body ${compact ? 'mt-1 text-[0.65rem]' : 'mt-2 text-sm'}`}>No attachments yet.</p>
          )}
        </div>
      ) : !showUploadSection && attachments.length === 0 ? (
        <p className={`text-muted-foreground font-body ${compact ? 'pt-2 px-2 text-[0.65rem]' : 'p-4 text-sm'}`}>No attachments.</p>
      ) : null}

      {attachments.length > 0 && (
        <div className="flex flex-col gap-6">
          {(() => {
            const imageAttachments = sortedAttachments.filter((a) => isImage(a.type))
            const nonImageAttachments = sortedAttachments.filter((a) => !isImage(a.type))

            const renderAttachmentCard = (attachment, isGallery = false) => {
              const attachmentId = attachment._id || attachment.id
              const canDelete =
                (attachment.uploadedBy?.toString() === userIdStr) || isProgrammerOrAdmin
              const attachmentIsImage = isImage(attachment.type)
              const fileUrl = getFileUrl(attachment.url)
              const displayUrl = attachmentIsImage && isGcsUrl(attachment.url)
                ? (signedUrls[attachment.url] || fileUrl)
                : fileUrl
              const status = attachment.status || 'ok'
              const isChangesNeeded = status === 'changes_needed'

              const actions = (
                <div className="flex flex-wrap gap-2 items-center">
                  <a
                    href={attachmentIsImage && isGcsUrl(attachment.url) ? displayUrl : fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-button text-primary hover:underline"
                    download
                  >
                    Download
                  </a>
                  {isProgrammerOrAdmin && (
                    <>
                      {isChangesNeeded ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          className="!px-2 !py-0.5 !min-h-0 whitespace-nowrap"
                          onClick={() => handleUpdateAttachmentStatus(attachmentId, 'ok', null)}
                          disabled={updatingStatusId === attachmentId}
                        >
                          {updatingStatusId === attachmentId ? '...' : 'Mark OK'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          className="!px-2 !py-0.5 !min-h-0 whitespace-nowrap"
                          onClick={() => {
                            const feedback = window.prompt('Optional: Add feedback for the client (e.g. "Logo needs higher resolution")')
                            handleUpdateAttachmentStatus(attachmentId, 'changes_needed', feedback?.trim() || null)
                          }}
                          disabled={updatingStatusId === attachmentId}
                        >
                          {updatingStatusId === attachmentId ? '...' : 'Request changes'}
                        </Button>
                      )}
                    </>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      variant="danger"
                      size="xs"
                      className="!px-2 !py-0.5 !min-h-0 whitespace-nowrap"
                      onClick={() => handleDelete(attachmentId)}
                      disabled={deletingId === attachmentId}
                    >
                      {deletingId === attachmentId ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
              )

              if (isGallery && attachmentIsImage) {
                return (
                  <div
                    key={attachmentId}
                    className="flex min-w-0 flex-col border border-border bg-surface overflow-hidden"
                  >
                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block aspect-square w-full overflow-hidden bg-muted"
                    >
                      <ImageWithFallback
                        src={displayUrl}
                        alt={attachment.filename}
                        fallbackIcon={getFileIcon(attachment.type)}
                      />
                      <div
                        className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                      >
                        <a
                          href={attachmentIsImage && isGcsUrl(attachment.url) ? displayUrl : fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex size-9 items-center justify-center bg-white/90 text-primary hover:bg-white"
                          download
                          title="Download"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="size-4" />
                        </a>
                        {isProgrammerOrAdmin && (
                          <>
                            {isChangesNeeded ? (
                              <button
                                type="button"
                                className="flex size-9 items-center justify-center bg-white/90 text-primary hover:bg-white"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleUpdateAttachmentStatus(attachmentId, 'ok', null)
                                }}
                                disabled={updatingStatusId === attachmentId}
                                title="Mark OK"
                              >
                                <RefreshCw className="size-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="flex size-9 items-center justify-center bg-white/90 text-primary hover:bg-white"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const feedback = window.prompt('Optional: Add feedback for the client (e.g. "Logo needs higher resolution")')
                                  handleUpdateAttachmentStatus(attachmentId, 'changes_needed', feedback?.trim() || null)
                                }}
                                disabled={updatingStatusId === attachmentId}
                                title="Request changes"
                              >
                                <RefreshCw className="size-4" />
                              </button>
                            )}
                          </>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center bg-white/90 text-red-600 hover:bg-white"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDelete(attachmentId)
                            }}
                            disabled={deletingId === attachmentId}
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </a>
                  </div>
                )
              }

              return (
                <div
                  key={attachmentId}
                  className="flex items-center gap-4 p-4 border border-border bg-surface"
                >
                  <div className="shrink-0 flex size-12 items-center justify-center rounded-none border border-border bg-muted text-lg">
                    {getFileIcon(attachment.type)}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-sm font-medium truncate" title={attachment.filename}>
                        {attachment.filename}
                      </span>
                      {isChangesNeeded && (
                        <Badge variant="warning" className="shrink-0">Changes needed</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-body">
                      {attachment.uploadedAt && `Uploaded ${new Date(attachment.uploadedAt).toLocaleDateString()}`}
                      {attachment.uploadedBy && (
                        <span>
                          {attachment.uploadedAt ? ' by ' : 'Uploaded by '}
                          {typeof attachment.uploadedBy === 'object' && attachment.uploadedBy?.name
                            ? attachment.uploadedBy.name
                            : 'Unknown'}
                        </span>
                      )}
                    </p>
                  </div>
                  {actions}
                </div>
              )
            }

            return (
              <>
                {imageAttachments.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h4 className="font-heading text-xs uppercase tracking-wide text-ink">Images</h4>
                    <div className="attachment-gallery border border-border bg-surface p-4" role="region" aria-label="Image gallery">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {imageAttachments.map((a) => renderAttachmentCard(a, true))}
                      </div>
                    </div>
                  </div>
                )}
                {nonImageAttachments.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h4 className="font-heading text-xs uppercase tracking-wide text-ink">Files</h4>
                    <div className="flex flex-col gap-3">
                      {nonImageAttachments.map((a) => renderAttachmentCard(a, false))}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default AttachmentManager
