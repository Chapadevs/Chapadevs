import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import Header from '../../components/Header/Header'
import UserStatus from '../../components/UserStatus/UserStatus'
import AIPreviewGenerator from '../../components/AIPreviewGenerator/AIPreviewGenerator'
import './Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()

  const renderRoleSpecificContent = () => {
    switch (user?.role) {
      case 'admin':
        return (
          <div className="role-section">
            <h3>Admin Panel</h3>
            <p>Manage users, projects, and system settings</p>
            <div className="dashboard-actions">
              <Link to="/projects" className="dashboard-link">
                View All Projects
              </Link>
              <Link to="/assignments" className="dashboard-link">
                Manage Assignments
              </Link>
            </div>
          </div>
        )
      case 'programmer':
        return (
          <div className="role-section">
            <h3>Programmer Dashboard</h3>
            <p>View and manage your assigned projects</p>
            <div className="dashboard-actions">
              <Link to="/projects" className="dashboard-link">
                My Assigned Projects
              </Link>
              <Link to="/assignments" className="dashboard-link">
                Available Projects
              </Link>
            </div>
          </div>
        )
      case 'client':
      default:
        return (
          <>
            <div className="role-section">
              <h3>Client Dashboard</h3>
              <p>Track your projects and inquiries</p>
              <div className="dashboard-actions">
                <Link to="/projects" className="dashboard-link">
                  My Projects
                </Link>
                <Link to="/projects/create" className="dashboard-link">
                  Create New Project
                </Link>
              </div>
            </div>
            
            <AIPreviewGenerator />
          </>
        )
    }
  }

  return (
    <>
      <Header />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>

        <div className="dashboard-content">
          <div className="welcome-card">
            <h2>Welcome, {user?.name}!</h2>
            <p>Email: {user?.email}</p>
            <p>Role: <span className={`role-badge role-badge--${user?.role}`}>{user?.role?.toUpperCase()}</span></p>
            {user?.company && <p>Company: {user.company}</p>}
          </div>

          <div className="quick-actions-card">
            <h3>Quick Actions</h3>
            <div className="dashboard-actions">
              <Link to="/profile" className="dashboard-link">
                Edit Profile
              </Link>
              <Link to="/settings/change-password" className="dashboard-link">
                Change Password
              </Link>
            </div>
          </div>

          {(user?.role === 'programmer' || user?.role === 'client') && (
            <UserStatus />
          )}

          {renderRoleSpecificContent()}
        </div>
      </div>
    </>
  )
}

export default Dashboard

