import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/layout-components/ProtectedRoute/ProtectedRoute'
import RoleProtectedRoute from './components/layout-components/ProtectedRoute/RoleProtectedRoute'
import Home from './pages/Home/Home'
import Contact from './pages/resource-pages/Contact/Contact'
import Login from './pages/authentication-pages/Login/Login'
import Register from './pages/authentication-pages/Register/Register'
import VerifyEmail from './pages/authentication-pages/VerifyEmail/VerifyEmail'
import ForgotPassword from './pages/authentication-pages/ForgotPassword/ForgotPassword'
import ResetPassword from './pages/authentication-pages/ResetPassword/ResetPassword'
import ConfirmPasswordChange from './pages/authentication-pages/ConfirmPasswordChange/ConfirmPasswordChange'
import Dashboard from './pages/dashboard-pages/Dashboard/Dashboard'
import EditProfile from './pages/profile-pages/EditProfile/EditProfile'
import UserProfileView from './pages/profile-pages/UserProfileView/UserProfileView'
import ChangePassword from './pages/authentication-pages/ChangePassword/ChangePassword'
import ProjectList from './pages/project-pages/ProjectList/ProjectList'
import CreateProject from './pages/project-pages/CreateProject/CreateProject'
import ProjectDetail from './pages/project-pages/ProjectDetail/ProjectDetail'
import Team from './pages/resource-pages/Team/Team'
import AvailableProjects from './pages/explore-pages/AvailableProjects/AvailableProjects'
import './styles.css'

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/team" element={<Team />} />
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
                <EditProfile />
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
          <Route
            path="/assignments"
            element={
              <ProtectedRoute>
                <AvailableProjects />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App

