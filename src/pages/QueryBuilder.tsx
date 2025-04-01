import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { QueryBuilder } from '../components/reports/QueryBuilder';
import { Button } from '../components/shared/Button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { StatusMessage } from '../components/shared/StatusMessage';

export function QueryBuilderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState({
    name: '',
    description: '',
    customQueries: [],
    selectedFields: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is admin
    const checkAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        navigate('/dashboard');
      }
    };

    checkAccess();
  }, [user, navigate]);

  const handleSave = async (newConfig: any) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { error: saveError } = await supabase
        .from('saved_queries')
        .insert([{
          name: newConfig.name,
          description: newConfig.description,
          config: {
            queries: newConfig.customQueries,
            fields: newConfig.selectedFields
          },
          created_by: user?.id
        }]);

      if (saveError) throw saveError;

      setSuccess('Query saved successfully');
      setTimeout(() => {
        navigate('/admin/reports');
      }, 1500);
    } catch (err) {
      console.error('Error saving query:', err);
      setError('Failed to save query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Query Builder</h1>
            <p className="mt-1 text-sm text-gray-500">
              Build and save custom queries for reports
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/reports')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Reports
          </Button>
        </div>

        {error && <StatusMessage type="error" message={error} />}
        {success && <StatusMessage type="success" message={success} />}

        <QueryBuilder
          config={config}
          onChange={handleSave}
          onClose={() => navigate('/admin/reports')}
        />
      </div>
    </DashboardLayout>
  );
}