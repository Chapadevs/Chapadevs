# Chapadevs CRM Backend API

Backend API for the Chapadevs CRM system built with Node.js, Express, and MongoDB (Mongoose).

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file with the following variables:

```env
MONGO_URI=your-mongodb-atlas-connection-string
DB_NAME=chapadevs_crm
JWT_SECRET=your-secret-key
BACKEND_PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:3001`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Google Cloud Run deployment instructions.

