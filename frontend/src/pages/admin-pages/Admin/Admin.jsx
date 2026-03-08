import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '@/components/layout-components/Header/Header'
import { PageTitle, Card, Button, Badge, Select } from '@/components/ui-components'
import { userAPI, projectAPI } from '@/services/api'
import { formatDateOnly } from '@/utils/dateUtils'
import { useAuth } from '@/context/AuthContext'

const Admin = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [usersError, setUsersError] = useState(null)
  const [projectsError, setProjectsError] = useState(null)
  const [updatingUserId, setUpdatingUserId] = useState(null)
  const [deletingUserId, setDeletingUserId] = useState(null)

  const loadUsers = async () => {
    try {
      setUsersLoading(true)
      setUsersError(null)
      const data = await userAPI.getUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setUsersError(err.response?.data?.message || err.message || 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      setProjectsLoading(true)
      setProjectsError(null)
      const data = await projectAPI.getAll()
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      setProjectsError(err.response?.data?.message || err.message || 'Failed to load projects')
    } finally {
      setProjectsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    loadProjects()
  }, [])

  const handleRoleChange = async (userId, newRole) => {
    if (!newRole) return
    try {
      setUpdatingUserId(userId)
      await userAPI.updateUser(userId, { role: newRole })
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      )
    } catch (err) {
      setUsersError(err.response?.data?.message || err.message || 'Failed to update role')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (userId === currentUser?._id) {
      setUsersError('You cannot delete your own account')
      return
    }
    if (!window.confirm(`Delete user "${userName}"? This action cannot be undone.`)) return
    try {
      setDeletingUserId(userId)
      await userAPI.deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u._id !== userId))
    } catch (err) {
      setUsersError(err.response?.data?.message || err.message || 'Failed to delete user')
    } finally {
      setDeletingUserId(null)
    }
  }

  const getStatusBadgeVariant = (status) => {
    const s = (status || '').toLowerCase()
    if (['holding', 'open', 'ready', 'development', 'completed', 'cancelled'].includes(s))
      return s
    return 'default'
  }

  return (
    <>
      <Header />
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <PageTitle className="mb-8">Admin</PageTitle>

        <section className="mb-12">
          <h2 className="font-heading text-lg uppercase tracking-wide text-ink mb-4">
            Users
          </h2>
          {usersLoading ? (
            <p className="font-body text-ink-muted">Loading users...</p>
          ) : usersError ? (
            <p className="font-body text-red-600">{usersError}</p>
          ) : users.length === 0 ? (
            <p className="font-body text-ink-muted">No users found.</p>
          ) : (
            <Card variant="default" className="overflow-hidden rounded-none">
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50">
                      <th className="text-left font-heading text-xs uppercase tracking-wider px-4 py-3">
                        Name
                      </th>
                      <th className="text-left font-heading text-xs uppercase tracking-wider px-4 py-3">
                        Email
                      </th>
                      <th className="text-left font-heading text-xs uppercase tracking-wider px-4 py-3">
                        Role
                      </th>
                      <th className="text-right font-heading text-xs uppercase tracking-wider px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u._id}
                        className="border-b border-border last:border-b-0 hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-3 text-ink">{u.name || '—'}</td>
                        <td className="px-4 py-3 text-ink-secondary">{u.email || '—'}</td>
                        <td className="px-4 py-3">
                          <Select
                            value={u.role || 'user'}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            disabled={updatingUserId === u._id || u._id === currentUser?._id}
                            className="max-w-[140px] py-1.5 text-xs"
                          >
                            <option value="user">Client</option>
                            <option value="programmer">Programmer</option>
                            <option value="admin">Admin</option>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            disabled={
                              deletingUserId === u._id ||
                              u._id === currentUser?._id
                            }
                          >
                            {deletingUserId === u._id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-heading text-lg uppercase tracking-wide text-ink">
              Projects
            </h2>
            <Button to="/projects" variant="ghost" size="sm">
              View all
            </Button>
          </div>
          {projectsLoading ? (
            <p className="font-body text-ink-muted">Loading projects...</p>
          ) : projectsError ? (
            <p className="font-body text-red-600">{projectsError}</p>
          ) : projects.length === 0 ? (
            <p className="font-body text-ink-muted">No projects found.</p>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 10).map((p) => (
                <Link
                  key={p._id}
                  to={`/projects/${p._id}`}
                  className="block no-underline"
                >
                  <Card
                    variant="outline"
                    className="px-4 py-3 flex flex-row items-center justify-between gap-4 hover:border-primary transition-colors rounded-none"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-heading text-sm uppercase text-ink block truncate">
                        {p.title || 'Untitled'}
                      </span>
                      <span className="font-body text-xs text-ink-muted">
                        {p.clientId?.name || p.client?.name || 'No client'} · Due{' '}
                        {formatDateOnly(p.dueDate)}
                      </span>
                    </div>
                    <Badge variant={getStatusBadgeVariant(p.status)} className="shrink-0">
                      {p.status || '—'}
                    </Badge>
                  </Card>
                </Link>
              ))}
              {projects.length > 10 && (
                <div className="pt-2 text-center">
                  <Button to="/projects" variant="ghost" size="sm">
                    View all {projects.length} projects
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

export default Admin
