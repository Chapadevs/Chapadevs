# Chapadevs CRM Backend API

Backend API for the Chapadevs CRM system built with Node.js, Express, and MongoDB.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **User Roles**: Client, Programmer, and Admin
- **Project Management**: Full CRUD operations for projects
- **Project Assignment**: Programmers can assign themselves to projects
- **Role-Based Access**: Different permissions for clients and programmers

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User management
│   ├── projectController.js # Project CRUD
│   └── assignmentController.js # Project assignment
├── middleware/
│   ├── authMiddleware.js    # JWT verification & authorization
│   └── errorMiddleware.js   # Error handling
├── models/
│   ├── User.js              # User schema
│   └── Project.js           # Project schema
├── routes/
│   ├── authRoutes.js        # Auth endpoints
│   ├── userRoutes.js        # User endpoints
│   ├── projectRoutes.js     # Project endpoints
│   └── assignmentRoutes.js  # Assignment endpoints
├── utils/
│   └── generateToken.js     # JWT token generation
├── .env.example             # Environment variables template
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
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string for JWT signing
- `PORT`: Server port (default: 5000)
- `FRONTEND_URL`: Your React frontend URL

### 3. Start MongoDB

Make sure MongoDB is running on your system or use MongoDB Atlas.

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

### Client
- Can create and manage their own projects
- Can view only their projects
- Can edit projects in draft/pending status

### Programmer
- Can view available projects
- Can assign themselves to projects
- Can view and manage assigned projects
- Can update project status

### Admin
- Full access to all resources
- Can manage users
- Can view all projects

## Project Status Flow

1. **draft** - Initial state when client creates project
2. **pending** - Client submits project for assignment
3. **in-progress** - Assigned to a programmer
4. **review** - Ready for client review
5. **completed** - Project finished
6. **cancelled** - Project cancelled

## Database Models

### User Model
- name, email, password
- role (client/programmer/admin)
- company, phone, avatar
- skills (for programmers)
- bio, industry

### Project Model
- title, description
- client (reference to User)
- assignedProgrammer (reference to User)
- status, priority
- Project details (type, budget, timeline)
- Features, goals, design styles
- Notes array for project updates

## Next Steps

See `IMPLEMENTATION_PLAN.md` for the complete roadmap of features to implement.

