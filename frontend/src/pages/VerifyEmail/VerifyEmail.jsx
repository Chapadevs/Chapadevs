import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authAPI } from '../../services/api'
import './VerifyEmail.css'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')
  const successSet = useRef(false)
  const messageSet = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link. No token provided.')
      return
    }
    let cancelled = false
    authAPI
      .verifyEmail(token)
      .then((data) => {
        if (!cancelled) {
          successSet.current = true
          setStatus('success')
          const msg = data.message || 'Your email has been verified.'
          const isFreshVerification = /has been verified|was already verified/i.test(msg)
          if (isFreshVerification || !messageSet.current) {
            messageSet.current = true
            setMessage(msg)
          }
        }
      })
      .catch((err) => {
        if (!cancelled && !successSet.current) {
          setStatus('error')
          const msg = err.response?.data?.message || err.message || 'Verification failed.'
          setMessage(msg)
        }
      })
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="verify-email-container">
      <div className="verify-email-card">
        {status === 'loading' && (
          <>
            <h1>Verifying your email...</h1>
            <p>Please wait.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1>Email verified</h1>
            <p>{message}</p>
            <Link to="/login" className="verify-email-link">Go to login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>Verification failed</h1>
            <p>{message}</p>
            <Link to="/login" className="verify-email-link">Go to login</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail
