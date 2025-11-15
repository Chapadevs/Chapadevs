# Chapadevs Website - Monorepo Structure

This is a monorepo containing both the frontend (React + Vite) and backend (Node.js + Express) applications for the Chapadevs website.

## Project Structure

```
Chapadevs/
├── frontend/          # React + Vite frontend application
│   ├── public/        # Static assets (images, fonts, logos)
│   ├── src/           # React source code
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── config/        # Configuration files
│   │   ├── context/       # React context providers
│   │   ├── services/      # API services
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── dist/          # Build output
│   ├── index.html
│   ├── manifest.json
│   ├── vite.config.js
│   ├── package.json
│   └── .eslintrc.cjs
├── backend/           # Node.js + Express backend API
│   ├── config/        # Configuration files
│   ├── controllers/   # Route controllers
│   ├── middleware/    # Express middleware
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── utils/         # Utility functions
│   ├── server.js
│   └── package.json
└── README.md
```

## Frontend

The frontend is a React application built with Vite, converted from the original Angular application.

### Features

- **React 18** with functional components and hooks
- **Vite** for fast development and optimized builds
- **React Router** for navigation
- **EmailJS** integration for contact form submissions
- Responsive design matching the original Angular version
- All components and styling preserved from the original design

### Getting Started (Frontend)

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production (Frontend)

```bash
cd frontend
npm run build
```

The built files will be in the `frontend/dist` directory.

### Preview Production Build (Frontend)

```bash
cd frontend
npm run preview
```

## Backend

The backend is a Node.js + Express API server with MySQL database.

### Getting Started (Backend)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see `backend/README.md` for details)

4. Start the development server:
```bash
npm start
```

For more details about the backend setup, see `backend/README.md`.

## Components

All components have been converted from Angular to React:

- **Header**: Navigation with scroll-to functionality
- **Hero**: Main landing section with CTA
- **OurBusiness**: Business services with scroll animations
- **OurServices**: Service offerings
- **Team**: Team member cards
- **AI**: AI-powered workflow section
- **Features**: Feature showcase
- **InquiryForm**: Multi-step contact form with EmailJS
- **FAQ**: Accordion-style FAQ section
- **Footer**: Footer with links and contact info

## Environment Configuration

### Frontend

EmailJS configuration is in `frontend/src/config/environment.js`. The configuration matches the original Angular environment settings.

API URL can be configured via `VITE_API_URL` environment variable (defaults to `http://localhost:5000/api`).

### Backend

See `backend/README.md` for backend environment configuration details.

## Styling

All styles have been converted from SCSS to CSS. Each component has its own CSS file for better organization. The design and styling match the original Angular version exactly.

## Differences from Angular Version

- Uses React hooks instead of Angular lifecycle methods
- Form handling uses React state instead of Angular reactive forms
- Scroll animations use React useEffect and useState hooks
- Component structure follows React patterns (functional components)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile, tablet, and desktop

## License

Same as the original project.
