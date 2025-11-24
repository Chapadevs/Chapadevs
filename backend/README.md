# Chapadevs CRM Backend API

Backend API for the Chapadevs CRM system built with Node.js, Express, and MySQL/Sequelize.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **User Roles**: User, Programmer, and Admin
- **Project Management**: Full CRUD operations for projects
- **Project Assignment**: Programmers can assign themselves to projects
- **Role-Based Access**: Different permissions for clients and programmers

## Project Structure

```
backend/
├── config/
│   ├── database.js          # MySQL/Sequelize connection
│   └── associations.js     # Model associations
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User management
│   ├── projectController.js # Project CRUD
│   ├── assignmentController.js # Project assignment
│   ├── aiPreviewController.js # AI preview generation
│   ├── notificationController.js # Notifications
│   ├── supportTicketController.js # Support tickets
│   └── dashboardController.js # Dashboard data
├── middleware/
│   ├── authMiddleware.js    # JWT verification & authorization
│   └── errorMiddleware.js   # Error handling
├── models/
│   ├── User.js              # User model
│   ├── Project.js           # Project model
│   ├── ProjectNote.js      # Project notes
│   ├── AIPreview.js        # AI previews
│   ├── Notification.js     # Notifications
│   └── SupportTicket.js    # Support tickets
├── routes/
│   ├── authRoutes.js        # Auth endpoints
│   ├── userRoutes.js        # User endpoints
│   ├── projectRoutes.js     # Project endpoints
│   ├── assignmentRoutes.js  # Assignment endpoints
│   ├── aiPreviewRoutes.js  # AI preview endpoints
│   ├── notificationRoutes.js # Notification endpoints
│   ├── supportRoutes.js    # Support ticket endpoints
│   └── dashboardRoutes.js  # Dashboard endpoints
├── utils/
│   └── generateToken.js     # JWT token generation
├── migrations/              # Database migrations
├── server.js                # Express server setup
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `DB_HOST`: MySQL host (default: localhost)
- `DB_PORT`: MySQL port (default: 3306)
- `DB_NAME`: Database name (default: chapadevs_crm)
- `DB_USER`: MySQL username (default: root)
- `DB_PASSWORD`: MySQL password
- `JWT_SECRET`: A secure random string for JWT signing
- `PORT`: Server port (default: 5000)
- `FRONTEND_URL`: Your React frontend URL

### 3. Start MySQL

Make sure MySQL is running on your system. You can create the database using:
```bash
npm run create-db
```

### 4. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)
- `PUT /api/auth/profile` - Update user profile (Protected)
- `PUT /api/auth/change-password` - Change password (Protected)

### User Routes (`/api/users`)

- `GET /api/users/programmers` - Get all programmers (Protected)
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Project Routes (`/api/projects`)

- `POST /api/projects` - Create a new project (Protected)
- `GET /api/projects` - Get all projects (filtered by role) (Protected)
- `GET /api/projects/my-projects` - Get current user's projects (Protected)
- `GET /api/projects/assigned` - Get assigned projects (Programmer only)
- `GET /api/projects/:id` - Get project by ID (Protected)
- `PUT /api/projects/:id` - Update project (Protected)
- `DELETE /api/projects/:id` - Delete project (Protected)

### Assignment Routes (`/api/assignments`)

- `GET /api/assignments/available` - Get available projects (Programmer only)
- `POST /api/assignments/:projectId/assign` - Assign project (Programmer only)
- `POST /api/assignments/:projectId/accept` - Accept project (Programmer only)
- `POST /api/assignments/:projectId/reject` - Reject project (Programmer only)
- `DELETE /api/assignments/:projectId/unassign` - Unassign project (Programmer only)

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## User Roles

### User
- Can create and manage their own projects
- Can view only their projects
- Can edit projects in Holding/Ready status
- Access to AI previews, notifications, and support

### Programmer
- Can view available projects
- Can assign themselves to projects
- Can view and manage assigned projects
- Can update project status
- Has skills, bio, and hourlyRate fields

### Admin
- Full access to all resources
- Can manage users
- Can view all projects
- Can respond to support tickets

## Project Status Flow

1. **Holding** - Initial state when user creates project
2. **Ready** - User submits project for assignment
3. **Development** - Assigned to a programmer
4. **Completed** - Project finished
5. **Cancelled** - Project cancelled

## Database Models

### User Model
- name, email, password
- role (user/programmer/admin)
- skills, bio, hourlyRate (nullable, for programmers only)

### Project Model
- title, description
- clientId (reference to User)
- assignedProgrammerId (reference to User)
- status (Holding/Ready/Development/Completed/Cancelled)
- priority, projectType, budget, timeline
- Features, goals, design styles (JSON)
- Notes (via ProjectNote model)

### Additional Models
- **AIPreview**: AI-generated website previews
- **Notification**: User notifications
- **SupportTicket**: Support ticket system
- **ProjectNote**: Project update notes

