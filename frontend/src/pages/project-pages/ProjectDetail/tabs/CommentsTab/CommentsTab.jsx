import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectChat } from '../../hooks/useProjectChat'
import { projectAPI, chatAPI } from '../../../../../services/api'
import { 
  Button, 
  Alert, 
  SectionTitle, 
  Textarea, 
  Avatar, 
  AvatarImage, 
  AvatarFallback 
} from '../../../../../components/ui-components'
import { getAvatarUrl } from '../../../../../utils/avatarUtils'
import './CommentsTab.css'

const isGcsUrl = (url) => url && typeof url === 'string' && url.startsWith('https://storage.googleapis.com/')

const isImageFile = (file) => file?.type?.startsWith('image/')

const CommentsTab = ({ project, user }) => {
  const navigate = useNavigate()
  const projectId = project?._id || project?.id
  const { messages, loading, error, sending, sendMessage, markAsRead } = useProjectChat(projectId)
  const [messageContent, setMessageContent] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [signedUrls, setSignedUrls] = useState({})
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const fileInputRef = useRef(null)

  const [previewUrl, setPreviewUrl] = useState(null)
  useEffect(() => {
    if (pendingFile && isImageFile(pendingFile)) {
      const url = URL.createObjectURL(pendingFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [pendingFile])

  const removeAttachment = () => {
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (projectId && messages.length > 0) {
      markAsRead()
    }
  }, [projectId, markAsRead])

  // Fetch signed URLs for GCS attachments in messages
  useEffect(() => {
    const gcsUrls = []
    for (const msg of messages || []) {
      for (const att of msg.attachments || []) {
        if (isGcsUrl(att.url)) gcsUrls.push(att.url)
      }
    }
    const unique = [...new Set(gcsUrls)]
    if (unique.length === 0 || !projectId) return
    projectAPI
      .getProjectAttachmentSignedUrls(projectId, unique)
      .then(({ urls }) => {
        const map = {}
        unique.forEach((orig, i) => {
          map[orig] = urls[i] || orig
        })
        setSignedUrls(map)
      })
      .catch(() => {})
  }, [messages, projectId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((!messageContent.trim() && !pendingFile) || sending || uploading) return

    let attachments = []
    if (pendingFile) {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', pendingFile)
        const uploaded = await chatAPI.uploadAttachment(projectId, formData)
        attachments = [{ url: uploaded.url, filename: uploaded.filename, type: uploaded.type }]
      } catch (err) {
        setUploading(false)
        return
      }
      setUploading(false)
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const result = await sendMessage(messageContent, attachments)
    if (result.success) {
      setMessageContent('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 8400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOwnMessage = (message) => {
    const senderId = message.senderId?._id || message.senderId
    const userId = user?._id || user?.id
    return senderId?.toString() === userId?.toString()
  }

  if (!projectId) return <div className="project-tab-panel"><p>Project not found</p></div>

  return (
    <div className="project-tab-panel chat-container">
      <SectionTitle className="project-tab-panel-title mb-4">Comments</SectionTitle>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="chat-messages-container" ref={messagesContainerRef}>
        {loading ? (
          <div className="chat-loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty"><p>No messages yet. Start the conversation!</p></div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((message) => {
              const own = isOwnMessage(message)
              const sender = message.senderId || {}
              const senderName = sender.name || sender.email || 'Unknown'
              const senderId = sender._id || sender

              const handleSenderClick = (e) => {
                e.preventDefault()
                if (senderId) navigate(`/users/${senderId}`)
              }

              return (
                <div key={message._id || message.id} className={`chat-message ${own ? 'own' : 'other'}`}>
                  {/* Updated Avatar Implementation */}
                  <div 
                    className="chat-message-avatar cursor-pointer transition-opacity hover:opacity-80"
                    onClick={handleSenderClick}
                  >
                    <Avatar className="w-8 h-8 border border-white/10">
                      <AvatarImage 
                        src={getAvatarUrl(sender.avatar)} 
                        alt={senderName} 
                      />
                      <AvatarFallback className="text-[10px] bg-surface-gray">
                        {senderName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="chat-message-content">
                    <div className="chat-message-header">
                      <span 
                        className="chat-message-sender chat-message-sender-link"
                        onClick={handleSenderClick}
                      >
                        {senderName}
                      </span>
                      {sender.role && sender.role !== 'user' && (
                        <span className="chat-message-role">{sender.role}</span>
                      )}
                    </div>
                    {message.content && (
                      <div className="chat-message-text">{message.content}</div>
                    )}
                    {(message.attachments || []).length > 0 && (
                      <div className="chat-message-attachments flex flex-wrap gap-2 mt-1">
                        {(message.attachments || []).map((att, i) => {
                          const isImg = att.type && String(att.type).includes('image')
                          const displayUrl = isImg && isGcsUrl(att.url)
                            ? (signedUrls[att.url] || att.url)
                            : att.url
                          const fallbackUrl = att.url?.startsWith('http') ? att.url : ''
                          return (
                            <a
                              key={i}
                              href={displayUrl || fallbackUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="chat-attachment-link"
                            >
                              {isImg ? (
                                <img
                                  src={displayUrl || fallbackUrl}
                                  alt={att.filename}
                                  className="max-w-[120px] max-h-[120px] object-cover border border-border rounded-none"
                                />
                              ) : (
                                <span className="text-xs font-body text-primary hover:underline truncate max-w-[120px] block">
                                  {att.filename}
                                </span>
                              )}
                            </a>
                          )
                        })}
                      </div>
                    )}
                    <span className="chat-message-time">{formatTime(message.createdAt)}</span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form className="flex flex-col gap-2 mt-auto" onSubmit={handleSubmit}>
        <Textarea
          wrapperClassName="mt-auto"
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message"
          rows={3}
          disabled={sending || uploading}
          maxLength={5000}
          autoExpand
          minRows={3}
          maxHeight="200px"
          previewSlot={pendingFile ? (
            <div className="flex items-center gap-2 px-4 py-2">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={pendingFile.name}
                  className="max-w-[80px] max-h-[80px] object-cover border border-border rounded-none shrink-0"
                />
              ) : null}
              <span className="font-body text-sm truncate flex-1 min-w-0">{pendingFile.name}</span>
              <button
                type="button"
                onClick={removeAttachment}
                className="text-ink-muted hover:text-ink text-sm shrink-0 px-1 font-body"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </div>
          ) : null}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f && f.size <= 10 * 1024 * 1024) setPendingFile(f)
                e.target.value = ''
              }}
              className="hidden"
              aria-label="Attach file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading}
              className="text-sm font-body text-ink-muted hover:text-ink px-2 py-1 shrink-0"
              aria-label="Attach file"
            >
              + Attach
            </button>
            <span className="text-xs font-body text-ink-muted">{messageContent.length}/5000</span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={(!messageContent.trim() && !pendingFile) || sending || uploading}
            >
              {uploading ? 'Uploading...' : sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </Textarea>
      </form>
    </div>
  )
}

export default CommentsTab