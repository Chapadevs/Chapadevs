import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectChat } from '../../hooks/useProjectChat'
import './CommentsTab.css'

const CommentsTab = ({ project, user }) => {
  const navigate = useNavigate()
  const projectId = project?._id || project?.id
  const { messages, loading, error, sending, sendMessage, markAsRead } = useProjectChat(projectId)
  const [messageContent, setMessageContent] = useState('')
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Mark messages as read when tab is active
  useEffect(() => {
    if (projectId && messages.length > 0) {
      markAsRead()
    }
  }, [projectId, markAsRead]) // Only mark as read on mount, not on every message change

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
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  const isOwnMessage = (message) => {
    const senderId = message.senderId?._id || message.senderId
    const userId = user?._id || user?.id
    return senderId?.toString() === userId?.toString()
  }

  if (!projectId) {
    return (
      <div className="project-tab-panel">
        <p>Project not found</p>
      </div>
    )
  }

  return (
    <div className="project-tab-panel chat-container">
      <h3 className="project-tab-panel-title">Comments</h3>

      {error && (
        <div className="chat-error">
          {error}
        </div>
      )}

      <div className="chat-messages-container" ref={messagesContainerRef}>
        {loading ? (
          <div className="chat-loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((message) => {
              const own = isOwnMessage(message)
              const senderName = message.senderId?.name || message.senderId?.email || 'Unknown'
              const senderRole = message.senderId?.role || 'user'
              const senderId = message.senderId?._id || message.senderId
              
              const handleSenderClick = (e) => {
                e.preventDefault()
                if (senderId) {
                  navigate(`/users/${senderId}`)
                }
              }
              
              return (
                <div key={message._id || message.id} className={`chat-message ${own ? 'own' : 'other'}`}>
                  <div className="chat-message-content">
                    <div className="chat-message-header">
                      {senderId ? (
                        <span 
                          className="chat-message-sender chat-message-sender-link" 
                          onClick={handleSenderClick}
                        >
                          {senderName}
                        </span>
                      ) : (
                        <span className="chat-message-sender">{senderName}</span>
                      )}
                      {senderRole !== 'user' && (
                        <span className="chat-message-role">{senderRole}</span>
                      )}
                      <span className="chat-message-time">{formatTime(message.createdAt)}</span>
                    </div>
                    <div className="chat-message-text">{message.content}</div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-wrapper">
          <textarea
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
            <span className="chat-input-counter">
              {messageContent.length}/5000
            </span>
            <button
              type="submit"
              className="chat-send-button"
              disabled={!messageContent.trim() || sending}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CommentsTab
