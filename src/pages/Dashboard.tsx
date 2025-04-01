import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { StudentDashboard } from '../components/StudentDashboard';
import { InstructorDashboard } from '../components/InstructorDashboard';
import { AdminDashboard } from '../components/AdminDashboard';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

type UserProfile = {
  role: 'student' | 'instructor' | 'admin';
};

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        if (!user?.id) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // First, check if the profile exists
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          // Profile doesn't exist, attempt to create it with default role
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata.full_name || 'Unknown',
                role: 'student',
              },
            ])
            .select('role')
            .single();

          if (createError) {
            throw createError;
          }

          if (isMounted) {
            setProfile(newProfile);
          }
        } else {
          if (isMounted) {
            setProfile(data);
          }
        }
      } catch (error) {
        console.error('Error loading/creating user profile:', error);
        if (isMounted) {
          setError('Failed to load user profile');
          // Sign out the user if we can't load or create their profile
          await signOut();
          navigate('/login');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user, navigate, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Return to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout>
      {profile.role === 'admin' ? (
        <AdminDashboard />
      ) : profile.role === 'instructor' ? (
        <InstructorDashboard />
      ) : (
        <StudentDashboard />
      )}
    </DashboardLayout>
  );
}