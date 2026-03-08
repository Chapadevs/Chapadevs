import { useState, useMemo, useEffect } from 'react'
import { projectAPI } from '../../../../../services/api'
import { PageTitle, Badge, Alert } from '../../../../../components/ui-components'
import { isGcsUrl, getFileUrl, getFileIcon, isImage, getFileFormat } from '../../utils/attachmentUtils'

const AssetsTab = ({ project, canUploadAttachments = false, onPhaseUpdate, onProjectUpdate }) => {
  const [phaseFilter, setPhaseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [copySuccessId, setCopySuccessId] = useState(null)
  const [signedUrls, setSignedUrls] = useState({})
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const { items, phases } = useMemo(() => {
    const phases = project?.phases || []
    const items = []
    for (const att of project?.attachments || []) {
      items.push({
        ...att,
        phaseName: 'General',
        subStepName: null,
        phaseId: null,
        subStepId: null,
        sourceType: 'additional-assets',
      })
    }
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !onProjectUpdate) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }
    try {
      setUploading(true)
      setUploadError(null)
      const formData = new FormData()
      formData.append('file', file)
      const updated = await projectAPI.uploadProjectLevelAttachment(
        project._id || project.id,
        formData
      )
      onProjectUpdate(updated)
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
      <section className="project-section w-full">
        <p className="font-body text-ink-muted">Loading project...</p>
      </section>
    )
  }

  return (
    <section className="project-section w-full">
      <PageTitle>Assets</PageTitle>
      <p className="font-body text-ink-muted mt-1 mb-4">
        General project images and files, plus assets attached to phases and tasks. Copy links to share.
      </p>

      {(phases.length > 0 || items.length > 0) ? (
        <div className="mb-3 flex flex-wrap items-start justify-start gap-x-4 gap-y-2 py-0.5 w-full min-w-0">
          {phases.length > 0 && (
            <div className="flex flex-col gap-0.5 shrink-0">
              <label className="font-body text-[8px] text-ink-muted shrink-0 whitespace-nowrap leading-none">Phase</label>
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                className="font-body text-[8px] leading-tight border border-border px-0.5 py-0 rounded-none bg-surface w-[52px] h-6 shrink-0 min-h-0"
              >
                <option value="">All</option>
                {phases.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.title || `Phase ${p.order ?? ''}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-0.5 shrink-0">
            <label className="font-body text-[8px] text-ink-muted shrink-0 whitespace-nowrap leading-none">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="font-body text-[8px] leading-tight border border-border px-0.5 py-0 rounded-none bg-surface w-[52px] h-6 shrink-0 min-h-0"
            >
              <option value="">All</option>
              <option value="additional-assets">Assets</option>
              <option value="task">Tasks</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5 shrink-0">
            <label className="font-body text-[8px] text-ink-muted shrink-0 whitespace-nowrap leading-none">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-body text-[8px] leading-tight border border-border px-0.5 py-0 rounded-none bg-surface w-[52px] h-6 shrink-0 min-h-0"
            >
              <option value="">All</option>
              <option value="ok">OK</option>
              <option value="changes_needed">Changes</option>
            </select>
          </div>
          {(phaseFilter || sourceFilter || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setPhaseFilter('')
                setSourceFilter('')
                setStatusFilter('')
              }}
              className="font-button text-[8px] text-primary hover:underline shrink-0 leading-none self-center"
            >
              Clear
            </button>
          )}
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <p className="font-body text-ink-muted py-8">
          No attachments yet. {canUploadAttachments ? 'Upload files below or in task modals.' : 'Upload files in task modals.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
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
                    <span className="absolute top-0.5 right-0.5 px-1 py-0.5 text-[9px] font-heading uppercase tracking-wide bg-black/60 text-white rounded-none">
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
                    <div className="text-2xl">{getFileIcon(item.type)}</div>
                  )}
                </div>
                <div className="p-1 min-w-0">
                  <span className="font-body text-[11px] font-medium truncate block" title={item.filename}>
                    {item.filename}
                  </span>
                  <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
                    {(item.status || 'ok') === 'changes_needed' && (
                      <Badge variant="warning" className="shrink-0 text-[9px] !py-0 !px-1">
                        Changes
                      </Badge>
                    )}
                    <span className="font-heading text-[9px] uppercase text-ink-muted shrink-0">
                      {(item.sourceType || (item.subStepName ? 'task' : 'additional-assets')) === 'additional-assets' ? 'Assets' : 'Task'}
                    </span>
                  </div>
                </div>
                <div className="p-1 flex gap-0.5 flex-wrap">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-button text-primary hover:underline"
                  >
                    Open
                  </a>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="text-[10px] font-button text-primary hover:underline"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(item)}
                    className="text-[10px] font-button text-primary hover:underline"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {canUploadAttachments && (
        <div className="mt-6 p-3 flex flex-col items-center justify-center">
          {uploadError && <Alert variant="error" className="mb-2">{uploadError}</Alert>}
          <div className="flex flex-col gap-1 items-center">
            <label className="font-heading text-[10px] uppercase tracking-wide text-ink-muted">Upload file</label>
            <label className="cursor-pointer flex flex-col items-center gap-0.5">
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <span className="inline-block font-button text-xs bg-primary text-white rounded-none hover:opacity-90 transition-opacity px-3 py-1.5">
                {uploading ? 'Uploading...' : '+ Choose file'}
              </span>
              <span className="font-body text-xs text-ink-muted">Max 10MB</span>
            </label>
          </div>
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
