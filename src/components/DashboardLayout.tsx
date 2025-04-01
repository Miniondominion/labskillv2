import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, ClipboardCheck as ChalkboardTeacher, ArrowLeft, GraduationCap, User, Bug, Users, BookOpen, PlusCircle, List, UserCog } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLocation, useNavigate, Link } from 'react-router-dom';

type DashboardLayoutProps = {
  children: ReactNode;
};

type UserProfile = {
  role: 'student' | 'instructor' | 'admin';
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut, impersonatedUser, stopImpersonation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === '/dashboard';

  useEffect(() => {
    async function getUserRole() {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      setUserRole(data?.role || null);
    }

    getUserRole();
  }, [user]);

  const renderQuickActions = () => {
    if (!userRole || !isDashboard) return null;

    switch (userRole) {
      case 'student':
        return (
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <Link
                to="/skills/log"
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 min-w-[140px]"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Log New Skill
              </Link>
              <Link
                to="/skills/logs"
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[140px]"
              >
                <List className="h-4 w-4 mr-2" />
                View Submissions
              </Link>
            </div>
          </div>
        );
      case 'instructor':
        return (
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <Link
                to="/classes"
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[140px]"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Manage Classes
              </Link>
              <Link
                to="/skills"
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[140px]"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Manage Skills
              </Link>
              <Link
                to="/instructor/students"
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[140px]"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Students
              </Link>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                {!isDashboard && (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="mr-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </button>
                )}
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-indigo-600">EMS Skills</h1>
                </div>
              </div>

              <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                {userRole === 'admin' && (
                  <button
                    onClick={() => navigate('/admin/students')}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Students
                  </button>
                )}
                <button
                  onClick={() => navigate('/profile')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => navigate('/debug')}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    Debug
                  </button>
                )}
                {impersonatedUser && (
                  <button
                    onClick={stopImpersonation}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-orange-700 hover:text-orange-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Exit Impersonation
                  </button>
                )}
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>

              <div className="flex items-center sm:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="sm:hidden">
              <div className="pt-2 pb-3 space-y-1">
                {!isDashboard && (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </button>
                )}
                {userRole === 'admin' && (
                  <button
                    onClick={() => navigate('/admin/students')}
                    className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Students
                  </button>
                )}
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => navigate('/debug')}
                    className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    Debug
                  </button>
                )}
                {impersonatedUser && (
                  <button
                    onClick={stopImpersonation}
                    className="w-full flex items-center px-4 py-2 text-orange-700 hover:bg-orange-50"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Exit Impersonation
                  </button>
                )}
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Role-specific Banners */}
        {userRole === 'instructor' && (
          <div className="bg-indigo-600">
            <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center space-x-2">
                <ChalkboardTeacher className="h-5 w-5 text-indigo-100" />
                <p className="text-sm font-medium text-indigo-100">
                  Instructor Dashboard
                </p>
              </div>
            </div>
          </div>
        )}

        {userRole === 'student' && (
          <div className="bg-green-600">
            <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center space-x-2">
                <GraduationCap className="h-5 w-5 text-green-100" />
                <p className="text-sm font-medium text-green-100">
                  Student Dashboard
                </p>
              </div>
            </div>
          </div>
        )}

        {impersonatedUser && (
          <div className="bg-orange-600">
            <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center space-x-2">
                <UserCog className="h-5 w-5 text-orange-100" />
                <p className="text-sm font-medium text-orange-100">
                  Impersonating: {impersonatedUser.user_metadata.full_name}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content - Add padding to account for fixed header */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-28">
        {renderQuickActions()}
        {children}
      </main>
    </div>
  );
}