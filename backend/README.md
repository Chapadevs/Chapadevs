# Chapadevs CRM Backend API

Backend API for the Chapadevs CRM system built with Node.js, Express, and MySQL/Sequelize.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file with the following variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chapadevs_crm
DB_USER=root
DB_PASSWORD=your-password
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup

Make sure MySQL is running, then create the database:

```bash
npm run create-db
```

### 4. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:5000`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Google Cloud Run deployment instructions.

