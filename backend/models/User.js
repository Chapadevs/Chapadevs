import { DataTypes } from 'sequelize'
import { sequelize } from '../config/database.js'
import bcrypt from 'bcryptjs'

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add a name' }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Please add a valid email' },
      notEmpty: { msg: 'Please add an email' }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: {
        args: [6, 255],
        msg: 'Password must be at least 6 characters'
      },
      notEmpty: { msg: 'Please add a password' }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'programmer', 'admin'),
    defaultValue: 'user'
  },
  // Programmer-specific fields (nullable, only used when role = 'programmer')
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(user.password, salt)
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(user.password, salt)
      }
    },
  }
})

// Instance method to match password
User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Add indexes
User.addHook('afterSync', async () => {
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_role ON users(role);
  `).catch(() => {}) // Ignore if indexes already exist
})

export default User
