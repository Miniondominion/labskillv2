import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, AlertCircle, CheckCircle, X, BookOpen, Mail, UserCog, ClipboardList, FileText, Settings, BarChart as ChartBar, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type User = {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  full_name: string;
  created_at: string;
  affiliated_instructor: string | null;
};

type Instructor = {
  id: string;
  full_name: string;
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, startImpersonation } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: '' as 'student' | 'instructor' | 'admin',
    affiliated_instructor: '' as string | null
  });
  const [sendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadInstructors();
  }, []);

  useEffect(() => {
    if (editingUser) {
      setEditForm({
        full_name: editingUser.full_name,
        role: editingUser.role,
        affiliated_instructor: editingUser.affiliated_instructor
      });
    }
  }, [editingUser]);

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function loadInstructors() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'instructor')
        .order('full_name');

      if (error) throw error;
      setInstructors(data || []);
    } catch (err) {
      console.error('Error loading instructors:', err);
      setError('Failed to load instructors');
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setError('');
      setSuccess('');

      const updates: any = {
        full_name: editForm.full_name,
        role: editForm.role,
      };

      // Only include affiliated_instructor if the user is a student
      if (editForm.role === 'student') {
        updates.affiliated_instructor = editForm.affiliated_instructor;
      } else {
        updates.affiliated_instructor = null; // Remove instructor affiliation for non-students
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editingUser.id);

      if (updateError) throw updateError;

      setSuccess('User updated successfully');
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user');
    }
  }

  async function handlePasswordReset(email: string) {
    try {
      setIsSendingPasswordReset(true);
      setError('');
      setSuccess('');

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess('Password reset email sent successfully');
    } catch (err) {
      console.error('Error sending password reset:', err);
      setError('Failed to send password reset email');
    } finally {
      setIsSendingPasswordReset(false);
    }
  }

  async function handleImpersonateUser(userId: string) {
    try {
      setImpersonating(userId);
      setError('');
      await startImpersonation(userId);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error impersonating user:', err);
      setError('Failed to impersonate user');
      setImpersonating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
        <div
          onClick={() => navigate('/skills')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Skills Management
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Manage skills and assignments
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {users.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/clinical-documentation')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardList className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Clinical Documentation
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Manage clinical records
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/portfolio-builder')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Briefcase className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Portfolio Builder
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Create portfolio templates
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
        <div
          onClick={() => setShowAddUser(true)}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Add New User
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Create user accounts
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/reports')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Reports Management
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Manage report templates
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/students')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Student Management
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Manage student accounts
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/reports/query-builder')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Query Builder
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Create custom reports
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Users
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Manage all users in the system
          </p>
        </div>
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'instructor'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {user.role === 'student' && user.affiliated_instructor
                          ? instructors.find(i => i.id === user.affiliated_instructor)?.full_name || 'Unknown'
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handlePasswordReset(user.email)}
                        disabled={sendingPasswordReset}
                        className="text-orange-600 hover:text-orange-900 mr-4"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleImpersonateUser(user.id)}
                        disabled={impersonating === user.id}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        <UserCog className="h-4 w-4 inline-block" />
                        {impersonating === user.id ? ' Switching...' : ' Act As'}
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    role: e.target.value as 'student' | 'instructor' | 'admin',
                    // Clear affiliated_instructor if role is not student
                    affiliated_instructor: e.target.value === 'student' ? editForm.affiliated_instructor : null
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Show instructor selection only for students */}
              {editForm.role === 'student' && (
                <div>
                  <label htmlFor="instructor" className="block text-sm font-medium text-gray-700">
                    Assigned Instructor
                  </label>
                  <select
                    id="instructor"
                    value={editForm.affiliated_instructor || ''}
                    onChange={(e) => setEditForm({ ...editForm, affiliated_instructor: e.target.value || null })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">No Instructor</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-between space-x-3">
                <button
                  type="button"
                  onClick={() => handlePasswordReset(editingUser.email)}
                  disabled={sendingPasswordReset}
                  className="inline-flex items-center justify-center py-2 px-4 border border-orange-300 shadow-sm text-sm font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Reset Password
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}