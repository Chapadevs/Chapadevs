import { useState, useMemo, useEffect } from 'react'
import { projectAPI } from '../../../../../services/api'
import { PageTitle, Badge, Alert } from '../../../../../components/ui-components'
import { isGcsUrl, getFileUrl, getFileIcon, isImage, getFileFormat } from '../../utils/attachmentUtils'

const AssetsTab = ({ project, canUploadAttachments = false, onPhaseUpdate }) => {
  const [phaseFilter, setPhaseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [copySuccessId, setCopySuccessId] = useState(null)
  const [signedUrls, setSignedUrls] = useState({})
  const [uploadPhaseId, setUploadPhaseId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const { items, phases } = useMemo(() => {
    const phases = project?.phases || []
    const items = []
    for (const phase of phases) {
      const phaseName = phase.title || `Phase ${phase.order ?? ''}`
      for (const att of phase.attachments || []) {
        items.push({
          ...att,
          phaseName,
          subStepName: null,
          phaseId: phase._id || phase.id,
          subStepId: null,
          sourceType: 'additional-assets',
        })
      }
      for (const subStep of phase.subSteps || []) {
        const subStepName = subStep.title || `Task ${subStep.order ?? ''}`
        for (const att of subStep.attachments || []) {
          items.push({
            ...att,
            phaseName,
            subStepName,
            phaseId: phase._id || phase.id,
            subStepId: subStep._id || subStep.id,
            sourceType: 'task',
          })
        }
      }
    }
    return { items, phases }
  }, [project])

  const filteredItems = useMemo(() => {
    let result = items
    if (phaseFilter) {
      result = result.filter((i) => i.phaseId === phaseFilter)
    }
    if (sourceFilter === 'additional-assets') {
      result = result.filter((i) => (i.sourceType || (i.subStepName ? 'task' : 'additional-assets')) === 'additional-assets')
    } else if (sourceFilter === 'task') {
      result = result.filter((i) => (i.sourceType || (i.subStepName ? 'task' : 'additional-assets')) === 'task')
    }
    if (statusFilter === 'changes_needed') {
      result = result.filter((i) => (i.status || 'ok') === 'changes_needed')
    } else if (statusFilter === 'ok') {
      result = result.filter((i) => (i.status || 'ok') === 'ok')
    }
    return result
  }, [items, phaseFilter, sourceFilter, statusFilter])

  useEffect(() => {
    const gcsUrls = items
      .filter((i) => isGcsUrl(i.url))
      .map((i) => i.url)
    const unique = [...new Set(gcsUrls)]
    if (unique.length === 0 || !project?._id) return
    projectAPI
      .getProjectAttachmentSignedUrls(project._id || project.id, unique)
      .then(({ urls }) => {
        const map = {}
        unique.forEach((orig, i) => {
          map[orig] = urls[i] || orig
        })
        setSignedUrls(map)
      })
      .catch(() => {})
  }, [items, project?._id])

  const getDisplayUrl = (item) => {
    if (isGcsUrl(item.url)) return signedUrls[item.url] || getFileUrl(item.url)
    return getFileUrl(item.url)
  }

  useEffect(() => {
    if (phases.length > 0 && !uploadPhaseId) {
      setUploadPhaseId(phases[0]._id || phases[0].id)
    }
  }, [phases, uploadPhaseId])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadPhaseId || !onPhaseUpdate) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }
    try {
      setUploading(true)
      setUploadError(null)
      const formData = new FormData()
      formData.append('file', file)
      const updated = await projectAPI.uploadAttachment(
        project._id || project.id,
        uploadPhaseId,
        formData
      )
      onPhaseUpdate(updated)
      e.target.value = ''
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleCopyLink = async (item) => {
    const url = getDisplayUrl(item)
    try {
      await navigator.clipboard.writeText(url)
      setCopySuccessId(item._id || item.url)
      setTimeout(() => setCopySuccessId(null), 2000)
    } catch (_) {}
  }

  if (!project) {
    return (
      <section className="project-section max-w-[1200px] mx-auto p-8">
        <p className="font-body text-ink-muted">Loading project...</p>
      </section>
    )
  }

  return (
    <section className="project-section max-w-[1200px] mx-auto p-8">
      <PageTitle>Assets</PageTitle>
      <p className="font-body text-ink-muted mt-1 mb-6">
        All images and files attached to phases and tasks. Copy links to share.
      </p>

      {canUploadAttachments && phases.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 p-4 border border-border bg-surface">
          <h3 className="font-heading text-xs uppercase tracking-wide text-ink">Upload file</h3>
          {uploadError && <Alert variant="error">{uploadError}</Alert>}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="font-body text-sm text-ink">Phase:</label>
              <select
                value={uploadPhaseId}
                onChange={(e) => setUploadPhaseId(e.target.value)}
                className="font-body text-sm border border-border px-3 py-1.5 rounded-none bg-surface"
              >
                {phases.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.title || `Phase ${p.order ?? ''}`}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-muted-foreground font-body text-xs">Max file size: 10MB</p>
            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <span className="inline-block font-button bg-primary text-white rounded-none hover:opacity-90 transition-opacity px-6 py-3">
                {uploading ? 'Uploading...' : '+ Upload File'}
              </span>
            </label>
          </div>
        </div>
      )}

      {(phases.length > 0 || items.length > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-4">
          {phases.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="font-body text-sm text-ink">Filter by phase:</label>
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                className="font-body text-sm border border-border px-3 py-1.5 rounded-none bg-surface"
              >
                <option value="">All phases</option>
                {phases.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.title || `Phase ${p.order ?? ''}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="font-body text-sm text-ink">Source:</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="font-body text-sm border border-border px-3 py-1.5 rounded-none bg-surface"
            >
              <option value="">All</option>
              <option value="additional-assets">Additional assets</option>
              <option value="task">Task attachments</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-body text-sm text-ink">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-body text-sm border border-border px-3 py-1.5 rounded-none bg-surface"
            >
              <option value="">All</option>
              <option value="ok">OK</option>
              <option value="changes_needed">Changes needed</option>
            </select>
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <p className="font-body text-ink-muted py-8">
          No attachments yet. {canUploadAttachments && phases.length > 0 ? 'Upload files above or in task modals.' : 'Upload files in task modals.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => {
            const fileUrl = getDisplayUrl(item)
            const itemId = item._id || item.url
            const isImg = isImage(item.type)
            const copied = copySuccessId === itemId
            const format = getFileFormat(item)

            return (
              <div
                key={itemId}
                className="flex flex-col border border-border bg-surface overflow-hidden"
              >
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
                  {format && (
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-heading uppercase tracking-wide bg-black/60 text-white rounded-none">
                      {format}
                    </span>
                  )}
                  {isImg ? (
                    <button
                      type="button"
                      className="w-full h-full p-0 border-0 cursor-pointer hover:opacity-90 transition-opacity bg-transparent"
                      onClick={() => setLightboxUrl(fileUrl)}
                    >
                      <img
                        src={fileUrl}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="text-4xl">{getFileIcon(item.type)}</div>
                  )}
                </div>
                <div className="p-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-sm font-medium truncate" title={item.filename}>
                      {item.filename}
                    </span>
                    {format && (
                      <span className="font-heading text-[10px] uppercase tracking-wide text-ink-muted shrink-0">
                        {format}
                      </span>
                    )}
                    {(item.status || 'ok') === 'changes_needed' && (
                      <Badge variant="warning" className="shrink-0">
                        Changes needed
                      </Badge>
                    )}
                    <Badge
                      variant="neutral"
                      className="shrink-0 text-xs"
                    >
                      {(item.sourceType || (item.subStepName ? 'task' : 'additional-assets')) === 'additional-assets'
                        ? 'Additional assets'
                        : 'Task'}
                    </Badge>
                  </div>
                  {(item.status || 'ok') === 'changes_needed' && item.changesNeededFeedback && (
                    <p className="text-xs text-amber-700 font-body truncate mt-0.5" title={item.changesNeededFeedback}>
                      {item.changesNeededFeedback}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground font-body truncate">
                    {item.phaseName}
                    {item.subStepName && ` • ${item.subStepName}`}
                  </div>
                  {item.uploadedAt && (
                    <div className="text-xs text-muted-foreground font-body mt-0.5">
                      {new Date(item.uploadedAt).toLocaleDateString()}
                      {item.uploadedBy && (
                        <span>
                          {' by '}
                          {typeof item.uploadedBy === 'object' && item.uploadedBy?.name
                            ? item.uploadedBy.name
                            : 'Unknown'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-2 flex gap-1 flex-wrap">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-button text-primary hover:underline"
                  >
                    Open
                  </a>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="text-xs font-button text-primary hover:underline"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(item)}
                    className="text-xs font-button text-primary hover:underline"
                  >
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}

export default AssetsTab
