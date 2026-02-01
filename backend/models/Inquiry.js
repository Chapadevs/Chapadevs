import mongoose from 'mongoose'

const inquirySchema = new mongoose.Schema(
  {
    from_name: { type: String, required: true, trim: true },
    from_email: { type: String, required: true, trim: true, lowercase: true },
    company_name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    contact_method: { type: String, trim: true, default: '' },
    project_type: { type: String, trim: true, default: '' },
    project_description: { type: String, trim: true, default: '' },
    goals: { type: [String], default: [] },
    goals_other: { type: String, trim: true, default: '' },
    features: { type: [String], default: [] },
    features_other: { type: String, trim: true, default: '' },
    styles: { type: [String], default: [] },
    budget: { type: String, trim: true, default: '' },
    timeline: { type: String, trim: true, default: '' },
    has_website: { type: String, trim: true, default: '' },
    website_url: { type: String, trim: true, default: '' },
    current_host: { type: String, trim: true, default: '' },
    branding: { type: String, trim: true, default: '' },
    branding_details: { type: String, trim: true, default: '' },
    content_status: { type: String, trim: true, default: '' },
    reference_websites: { type: String, trim: true, default: '' },
    special_requirements: { type: String, trim: true, default: '' },
    hear_about_us: { type: String, trim: true, default: '' },
    hear_about_us_other: { type: String, trim: true, default: '' },
    additional_comments: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
)

inquirySchema.index({ from_email: 1 })
inquirySchema.index({ createdAt: -1 })

const Inquiry = mongoose.model('Inquiry', inquirySchema)
export default Inquiry
