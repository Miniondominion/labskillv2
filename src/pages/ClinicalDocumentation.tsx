import { useState, useEffect, lazy, Suspense } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useClinical } from '../contexts/ClinicalContext';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

// Lazy load the view components
const StudentClinicalView = lazy(() => import('../components/clinical/StudentClinicalView'));
const InstructorClinicalView = lazy(() => import('../components/clinical/InstructorClinicalView'));

export function ClinicalDocumentation() {
  const { user } = useAuth();
  const { loading: contextLoading, error: contextError } = useClinical();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setUserRole(data?.role || null);
      } catch (err) {
        console.error('Error fetching user role:', err);
      } finally {
        setLoading(false);
      }
    }

    getUserRole();
  }, [user]);

  if (loading || contextLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }>
        {userRole === 'instructor' ? (
          <InstructorClinicalView />
        ) : (
          <StudentClinicalView />
        )}
      </Suspense>
    </DashboardLayout>
  );
}