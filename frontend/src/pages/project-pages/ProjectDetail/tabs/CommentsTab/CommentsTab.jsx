import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectChat } from '../../hooks/useProjectChat'
import { 
  Button, 
  Alert, 
  SectionTitle, 
  Textarea, 
  Avatar, 
  AvatarImage, 
  AvatarFallback 
} from '../../../../../components/ui-components'
import './CommentsTab.css'

const CommentsTab = ({ project, user }) => {
  const navigate = useNavigate()
  const projectId = project?._id || project?.id
  const { messages, loading, error, sending, sendMessage, markAsRead } = useProjectChat(projectId)
  const [messageContent, setMessageContent] = useState('')
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  // Helper to resolve avatar URLs (Consistent with Header/Profile)
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('data:image/')) return avatar
    if (avatar.startsWith('/uploads/')) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
      const baseUrl = backendUrl.replace('/api', '').replace(/\/$/, '')
      return `${baseUrl}${avatar}`
    }
    return avatar
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!messageContent.trim() || sending) return

    const result = await sendMessage(messageContent)
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

      {error && <Alert variant="error" className="chat-error">{error}</Alert>}

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

              console.log(sender)
              
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
                    <div className="chat-message-text">{message.content}</div>
                    <span className="chat-message-time">{formatTime(message.createdAt)}</span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Form section remains mostly the same */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-wrapper">
          <Textarea
            className="chat-input"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message"
            rows={3}
            disabled={sending}
            maxLength={5000}
          />
          <div className="chat-input-footer">
            <span className="chat-input-counter">{messageContent.length}/5000</span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!messageContent.trim() || sending}
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CommentsTab