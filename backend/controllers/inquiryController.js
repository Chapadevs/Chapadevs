import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import Inquiry from '../models/Inquiry.js'
import { sendMail } from '../services/emailService.js'
import { getInquiryAdminEmail, getInquiryUserConfirmationEmail } from '../utils/emailTemplates.js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@chapadevs.com'

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const trimmed = email.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

/**
 * POST /api/inquiry
 * Public. Accepts inquiry form payload; sends admin + user emails; optionally saves to DB.
 */
export const submitInquiry = asyncHandler(async (req, res) => {
  const body = req.body || {}

  const from_name = (body.from_name || '').trim()
  const from_email = (body.from_email || '').trim().toLowerCase()

  if (!from_name) {
    res.status(400)
    throw new Error('Name is required')
  }
  if (!from_email) {
    res.status(400)
    throw new Error('Email is required')
  }
  if (!isValidEmail(from_email)) {
    res.status(400)
    throw new Error('Invalid email address format')
  }

  const submission_date = new Date().toLocaleString()
  const formData = {
    from_name,
    from_email,
    company_name: (body.company_name || '').trim(),
    phone: (body.phone || '').trim(),
    contact_method: (body.contact_method || '').trim(),
    project_type: (body.project_type || '').trim(),
    project_description: (body.project_description || '').trim(),
    goals: Array.isArray(body.goals) ? body.goals : [],
    goals_other: (body.goals_other || '').trim(),
    features: Array.isArray(body.features) ? body.features : [],
    features_other: (body.features_other || '').trim(),
    styles: Array.isArray(body.styles) ? body.styles : [],
    budget: (body.budget || '').trim(),
    timeline: (body.timeline || '').trim(),
    has_website: (body.has_website || '').trim(),
    website_url: (body.website_url || '').trim(),
    current_host: (body.current_host || '').trim(),
    branding: (body.branding || '').trim(),
    branding_details: (body.branding_details || '').trim(),
    content_status: (body.content_status || '').trim(),
    reference_websites: (body.reference_websites || '').trim(),
    special_requirements: (body.special_requirements || '').trim(),
    hear_about_us: (body.hear_about_us || '').trim(),
    hear_about_us_other: (body.hear_about_us_other || '').trim(),
    additional_comments: (body.additional_comments || '').trim(),
    submission_date
  }

  const { text: adminText, html: adminHtml } = getInquiryAdminEmail(formData)
  const adminResult = await sendMail({
    to: ADMIN_EMAIL,
    subject: `New project inquiry from ${formData.from_name} (Chapadevs)`,
    text: adminText,
    html: adminHtml,
    replyTo: formData.from_email
  })

  if (!adminResult.success) {
    console.error('Inquiry: admin email failed', adminResult.error)
    res.status(503)
    throw new Error('Unable to send inquiry. Please try again later or contact us directly.')
  }

  const userData = {
    customer_name: formData.from_name,
    company_name: formData.company_name,
    project_type: formData.project_type,
    budget: formData.budget,
    timeline: formData.timeline,
    contact_method: formData.contact_method,
    submission_date: new Date().toLocaleDateString()
  }
  const { text: userText, html: userHtml } = getInquiryUserConfirmationEmail(userData)
  const userResult = await sendMail({
    to: formData.from_email,
    subject: "We've received your Chapadevs project inquiry",
    text: userText,
    html: userHtml
  })

  if (!userResult.success) {
    console.error('Inquiry: user confirmation email failed', userResult.error)
    // Still return 201; admin was notified. Optional: queue retry for user email.
  }

  if (mongoose.connection.readyState === 1) {
    try {
      await Inquiry.create(formData)
    } catch (err) {
      console.error('Inquiry: failed to save to DB', err.message)
    }
  }

  res.status(201).json({
    success: true,
    message: "Thank you! Your inquiry has been submitted. We've also sent you a confirmation email. We'll get back to you within 24 hours."
  })
})
