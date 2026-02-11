import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: 255,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Exclude password by default
    },
    role: {
      type: String,
      enum: ['user', 'programmer', 'admin'],
      default: 'user',
    },
    // Programmer-specific fields
    skills: {
      type: [String],
      default: undefined,
    },
    bio: {
      type: String,
      default: null,
    },
    hourlyRate: {
      type: Number,
      default: null,
    },
    aiTokenLimitMonthly: {
      type: Number,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },
    passwordChangeToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordChangeExpires: {
      type: Date,
      default: null,
      select: false,
    },
    status: {
      type: String,
      enum: ['online', 'away', 'busy', 'offline'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    avatar: {
      type: String,
      default: null,
    },
    company: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    industry: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
userSchema.index({ email: 1 })
userSchema.index({ role: 1 })

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Instance method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password)
}

const User = mongoose.model('User', userSchema)

export default User
