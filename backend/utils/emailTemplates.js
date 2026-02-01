/**
 * Email template helpers for inquiry, welcome, and verification emails.
 * All content is built in code (no external template engine).
 */

const FROM_NAME = process.env.FROM_NAME || 'Chapadevs'

/**
 * Build plain-text and HTML body for admin notification (new inquiry).
 * @param {Object} data - Inquiry form data
 * @returns {{ text: string, html: string }}
 */
export function getInquiryAdminEmail(data) {
  const lines = [
    `New project inquiry from ${data.from_name} (${data.from_email})`,
    '',
    '--- Contact ---',
    `Name: ${data.from_name}`,
    `Email: ${data.from_email}`,
    `Company: ${data.company_name || 'Not provided'}`,
    `Phone: ${data.phone || 'Not provided'}`,
    `Preferred contact: ${data.contact_method || 'Not specified'}`,
    '',
    '--- Project ---',
    `Type: ${data.project_type || 'Not specified'}`,
    `Description: ${data.project_description || 'None'}`,
    `Goals: ${(data.goals && data.goals.length) ? data.goals.join(', ') : 'Not specified'}${data.goals_other ? ` (${data.goals_other})` : ''}`,
    `Features: ${(data.features && data.features.length) ? data.features.join(', ') : 'Not specified'}${data.features_other ? ` (${data.features_other})` : ''}`,
    `Design styles: ${(data.styles && data.styles.length) ? data.styles.join(', ') : 'Not specified'}`,
    `Budget: ${data.budget || 'Not specified'}`,
    `Timeline: ${data.timeline || 'Not specified'}`,
    '',
    '--- Website (if any) ---',
    `Has website: ${data.has_website || 'Not specified'}`,
    `URL: ${data.website_url || 'Not provided'}`,
    `Current host: ${data.current_host || 'Not provided'}`,
    '',
    '--- Other ---',
    `Branding: ${data.branding || 'Not specified'}${data.branding_details ? ` - ${data.branding_details}` : ''}`,
    `Content status: ${data.content_status || 'Not specified'}`,
    `Reference websites: ${data.reference_websites || 'Not provided'}`,
    `Special requirements: ${data.special_requirements || 'None'}`,
    `How they heard about us: ${data.hear_about_us || 'Not specified'}${data.hear_about_us_other ? ` (${data.hear_about_us_other})` : ''}`,
    `Additional comments: ${data.additional_comments || 'None'}`,
    '',
    `Submitted: ${data.submission_date || new Date().toLocaleString()}`
  ]
  const text = lines.join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Inquiry</title></head>
<body style="font-family: sans-serif; max-width: 640px;">
  <h2>New project inquiry</h2>
  <p><strong>${escapeHtml(data.from_name)}</strong> &lt;${escapeHtml(data.from_email)}&gt;</p>
  <p>Company: ${escapeHtml(data.company_name || 'Not provided')} | Phone: ${escapeHtml(data.phone || 'Not provided')} | Contact: ${escapeHtml(data.contact_method || 'Not specified')}</p>
  <hr/>
  <p><strong>Project type:</strong> ${escapeHtml(data.project_type || 'Not specified')}</p>
  <p><strong>Description:</strong><br/>${escapeHtml(data.project_description || 'None').replace(/\n/g, '<br/>')}</p>
  <p><strong>Goals:</strong> ${escapeHtml((data.goals && data.goals.length) ? data.goals.join(', ') : 'Not specified')}</p>
  <p><strong>Features:</strong> ${escapeHtml((data.features && data.features.length) ? data.features.join(', ') : 'Not specified')}</p>
  <p><strong>Styles:</strong> ${escapeHtml((data.styles && data.styles.length) ? data.styles.join(', ') : 'Not specified')}</p>
  <p><strong>Budget:</strong> ${escapeHtml(data.budget || 'Not specified')} | <strong>Timeline:</strong> ${escapeHtml(data.timeline || 'Not specified')}</p>
  <p><strong>Has website:</strong> ${escapeHtml(data.has_website || 'Not specified')} | <strong>URL:</strong> ${escapeHtml(data.website_url || 'Not provided')}</p>
  <p><strong>Special requirements:</strong> ${escapeHtml(data.special_requirements || 'None')}</p>
  <p><strong>Additional comments:</strong> ${escapeHtml(data.additional_comments || 'None')}</p>
  <hr/>
  <p style="color:#666;">Submitted: ${escapeHtml(data.submission_date || new Date().toLocaleString())}</p>
</body>
</html>`.trim()

  return { text, html }
}

/**
 * Build plain-text and HTML body for user confirmation (inquiry received).
 * @param {Object} data - { customer_name, company_name, project_type, budget, timeline, contact_method, submission_date }
 * @returns {{ text: string, html: string }}
 */
export function getInquiryUserConfirmationEmail(data) {
  const text = [
    `Hi ${data.customer_name},`,
    '',
    'Thank you for your interest in Chapadevs! We have received your project inquiry.',
    '',
    `Project type: ${data.project_type || 'Not specified'}`,
    `Budget: ${data.budget || 'Not specified'}`,
    `Timeline: ${data.timeline || 'Not specified'}`,
    `Preferred contact: ${data.contact_method || 'Not specified'}`,
    '',
    "We'll get back to you within 24 hours. If you have any questions in the meantime, just reply to this email.",
    '',
    'Best regards,',
    FROM_NAME
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Inquiry received</title></head>
<body style="font-family: sans-serif; max-width: 560px;">
  <p>Hi ${escapeHtml(data.customer_name)},</p>
  <p>Thank you for your interest in Chapadevs! We have received your project inquiry.</p>
  <p>Project type: ${escapeHtml(data.project_type || 'Not specified')} | Budget: ${escapeHtml(data.budget || 'Not specified')} | Timeline: ${escapeHtml(data.timeline || 'Not specified')}</p>
  <p>We'll get back to you within 24 hours. If you have any questions, just reply to this email.</p>
  <p>Best regards,<br/><strong>${escapeHtml(FROM_NAME)}</strong></p>
</body>
</html>`.trim()

  return { text, html }
}

/**
 * Build welcome/verification email (account confirmation).
 * @param {Object} opts - { name, email, verificationUrl? }
 * @returns {{ text: string, html: string, subject: string }}
 */
export function getWelcomeEmail(opts) {
  const { name, email, verificationUrl } = opts
  const subject = verificationUrl
    ? 'Verify your Chapadevs account'
    : 'Welcome to Chapadevs'

  const text = [
    `Hi ${name},`,
    '',
    verificationUrl
      ? 'Please verify your email address by clicking the link below:'
      : 'Your Chapadevs account has been created.',
    verificationUrl ? verificationUrl : '',
    verificationUrl ? 'This link expires in 24 hours.' : '',
    '',
    'If you did not create an account, you can ignore this email.',
    '',
    'Best regards,',
    FROM_NAME
  ].filter(Boolean).join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: sans-serif; max-width: 560px;">
  <p>Hi ${escapeHtml(name)},</p>
  ${verificationUrl
    ? `<p>Please verify your email address by clicking the link below:</p><p><a href="${escapeHtml(verificationUrl)}">Verify my email</a></p><p style="color:#666;">This link expires in 24 hours.</p>`
    : '<p>Your Chapadevs account has been created. You can log in and start using the dashboard.</p>'}
  <p>If you did not create an account, you can ignore this email.</p>
  <p>Best regards,<br/><strong>${escapeHtml(FROM_NAME)}</strong></p>
</body>
</html>`.trim()

  return { text, html, subject }
}

/**
 * Build password reset email.
 * @param {Object} opts - { name, resetUrl }
 * @returns {{ text: string, html: string, subject: string }}
 */
export function getPasswordResetEmail(opts) {
  const { name, resetUrl } = opts
  const subject = 'Reset your Chapadevs password'

  const text = [
    `Hi ${name},`,
    '',
    'You requested a password reset. Click the link below to set a new password:',
    resetUrl,
    'This link expires in 1 hour.',
    '',
    'If you did not request this, you can ignore this email. Your password will not change.',
    '',
    'Best regards,',
    FROM_NAME
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: sans-serif; max-width: 560px;">
  <p>Hi ${escapeHtml(name)},</p>
  <p>You requested a password reset. Click the link below to set a new password:</p>
  <p><a href="${escapeHtml(resetUrl)}">Reset my password</a></p>
  <p style="color:#666;">This link expires in 1 hour.</p>
  <p>If you did not request this, you can ignore this email. Your password will not change.</p>
  <p>Best regards,<br/><strong>${escapeHtml(FROM_NAME)}</strong></p>
</body>
</html>`.trim()

  return { text, html, subject }
}

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
