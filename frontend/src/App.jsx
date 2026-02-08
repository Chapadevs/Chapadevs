import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import RoleProtectedRoute from './components/ProtectedRoute/RoleProtectedRoute'
import Home from './pages/Home/Home'
import Contact from './pages/Contact/Contact'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import VerifyEmail from './pages/VerifyEmail/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword/ForgotPassword'
import ResetPassword from './pages/ResetPassword/ResetPassword'
import ConfirmPasswordChange from './pages/ConfirmPasswordChange/ConfirmPasswordChange'
import Dashboard from './pages/Dashboard/Dashboard'
import Profile from './pages/Profile/Profile'
import UserProfileView from './pages/UserProfileView/UserProfileView'
import ChangePassword from './pages/Settings/ChangePassword'
import ProjectList from './pages/projects/ProjectList/ProjectList'
import CreateProject from './pages/projects/CreateProject/CreateProject'
import ProjectDetail from './pages/ProjectDetail/ProjectDetail'
import Assignment from './pages/projects/Assignment/Assignment'
import './styles.css'

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirm-password-change" element={<ConfirmPasswordChange />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <UserProfileView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <Dashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/create"
            element={
              <ProtectedRoute>
                <CreateProject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/assignments" element={<Assignment />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App

