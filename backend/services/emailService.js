/**
 * Email service using Gmail API with service account (domain-wide delegation).
 * Sends from a Google Workspace user (e.g. noreply@chapadevs.com).
 * When Gmail env vars are not set, sendMail no-ops and logs (like Vertex AI pattern).
 */

import fs from 'fs'
import { google } from 'googleapis'

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send']

let gmail = null
let initialized = false

function getCredentialsSync() {
  const json = process.env.GMAIL_SERVICE_ACCOUNT_JSON
  const path = process.env.GMAIL_SERVICE_ACCOUNT_PATH
  if (json) {
    try {
      return JSON.parse(json)
    } catch (e) {
      console.error('Invalid GMAIL_SERVICE_ACCOUNT_JSON:', e.message)
      return null
    }
  }
  if (path) {
    try {
      const content = fs.readFileSync(path, 'utf8')
      return JSON.parse(content)
    } catch (e) {
      console.error('Failed to read GMAIL_SERVICE_ACCOUNT_PATH:', e.message)
      return null
    }
  }
  return null
}

async function initEmailService() {
  if (initialized) return gmail !== null
  const delegatedUser = process.env.GMAIL_DELEGATED_USER
  if (!delegatedUser) {
    console.warn('GMAIL_DELEGATED_USER not set. Email sending disabled.')
    initialized = true
    return false
  }
  const credentials = getCredentialsSync()
  if (!credentials) {
    console.warn('Gmail credentials not set. Email sending disabled.')
    initialized = true
    return false
  }
  try {
    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: GMAIL_SCOPES,
      subject: delegatedUser
    })
    await jwtClient.authorize()
    gmail = google.gmail({ version: 'v1', auth: jwtClient })
    initialized = true
    console.log('Email service initialized (Gmail API, delegated user: ' + delegatedUser + ')')
    return true
  } catch (err) {
    console.error('Email service init failed:', err.message)
    initialized = true
    return false
  }
}

/**
 * Build a MIME message (RFC 2822) and return base64url-encoded raw.
 */
function buildMimeRaw(options) {
  const { to, subject, text, html, replyTo, fromEmail, fromName } = options
  const from = fromName ? `"${fromName.replace(/"/g, '\\"')}" <${fromEmail}>` : fromEmail
  const boundary = '----=_Part_' + Date.now() + '_' + Math.random().toString(36).slice(2)
  const lines = [
    'From: ' + from,
    'To: ' + to,
    'Subject: ' + subject,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    '',
    '--' + boundary,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    text || '',
    '',
    '--' + boundary,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html || '',
    '',
    '--' + boundary + '--'
  ]
  if (replyTo) {
    const idx = lines.findIndex(l => l.startsWith('Subject:'))
    lines.splice(idx + 1, 0, 'Reply-To: ' + replyTo)
  }
  const raw = lines.join('\r\n')
  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Send a single email.
 * @param {Object} options - { to, subject, text, html?, replyTo?, fromEmail?, fromName? }
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendMail(options) {
  const ok = await initEmailService()
  if (!ok || !gmail) {
    console.warn('Email not sent (service not configured):', options.to, options.subject)
    return { success: false, error: 'Email service not configured' }
  }
  const fromEmail = options.fromEmail || process.env.FROM_EMAIL || process.env.GMAIL_DELEGATED_USER
  const fromName = options.fromName || process.env.FROM_NAME || 'Chapadevs'
  const raw = buildMimeRaw({
    to: options.to,
    subject: options.subject,
    text: options.text || '',
    html: options.html || options.text || '',
    replyTo: options.replyTo,
    fromEmail,
    fromName
  })
  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    })
    return { success: true, messageId: res.data.id }
  } catch (err) {
    console.error('Gmail send failed:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Check if the email service is available (for health or feature flags).
 */
export function isEmailServiceAvailable() {
  return initialized && gmail !== null
}

export default { sendMail, initEmailService, isEmailServiceAvailable }
