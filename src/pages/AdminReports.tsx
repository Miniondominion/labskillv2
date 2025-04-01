import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Settings, Plus, Search, Trash2, Eye, Edit } from 'lucide-react';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { SearchInput } from '../components/shared/SearchInput';
import { DataTable } from '../components/shared/DataTable';
import { StatusMessage } from '../components/shared/StatusMessage';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from '../components/DashboardLayout';

type SavedQuery = {
  id: string;
  name: string;
  description: string | null;
  config: {
    dataPoints: string[];
    dateRange: string;
    cohort: string;
    submissionTypes: string[];
    evaluationCriteria: string[];
    questions: string[];
    weights: Record<string, number>;
  };
  created_by: {
    full_name: string;
  };
  created_at: string;
  updated_at: string;
};

export function AdminReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSavedQueries();
  }, []);

  async function loadSavedQueries() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('saved_queries')
        .select(`
          *,
          created_by:profiles (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedQueries(data || []);
    } catch (err) {
      console.error('Error loading saved queries:', err);
      setError('Failed to load saved queries');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteQuery(queryId: string) {
    if (!window.confirm('Are you sure you want to delete this query?')) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('saved_queries')
        .delete()
        .eq('id', queryId);

      if (error) throw error;

      setSuccess('Query deleted successfully');
      await loadSavedQueries();
    } catch (err) {
      console.error('Error deleting query:', err);
      setError('Failed to delete query');
    }
  }

  const filteredQueries = savedQueries.filter(query =>
    query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage report templates and queries
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/reports/query-builder')}
              icon={<Settings className="h-4 w-4" />}
            >
              Query Builder
            </Button>
            <Button
              onClick={() => navigate('/reports/query-builder')}
              icon={<Plus className="h-4 w-4" />}
            >
              New Report
            </Button>
          </div>
        </div>

        {error && <StatusMessage type="error" message={error} />}
        {success && <StatusMessage type="success" message={success} />}

        {/* Saved Queries */}
        <Card>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Saved Queries</h2>
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search queries..."
                className="w-64"
              />
            </div>

            <DataTable
              data={filteredQueries}
              columns={[
                {
                  header: 'Name',
                  accessor: (query: SavedQuery) => (
                    <div>
                      <div className="text-sm font-medium text-gray-900">{query.name}</div>
                      {query.description && (
                        <div className="text-sm text-gray-500">{query.description}</div>
                      )}
                    </div>
                  )
                },
                {
                  header: 'Created By',
                  accessor: (query: SavedQuery) => (
                    <div className="text-sm text-gray-900">
                      {query.created_by.full_name}
                    </div>
                  )
                },
                {
                  header: 'Last Updated',
                  accessor: (query: SavedQuery) => (
                    <div className="text-sm text-gray-900">
                      {new Date(query.updated_at).toLocaleDateString()}
                    </div>
                  )
                },
                {
                  header: 'Actions',
                  accessor: (query: SavedQuery) => (
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye className="h-4 w-4" />}
                        onClick={() => navigate(`/reports/view/${query.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Edit className="h-4 w-4" />}
                        onClick={() => navigate('/reports/query-builder', { state: { query } })}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => handleDeleteQuery(query.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )
                }
              ]}
              loading={loading}
              emptyState={{
                icon: FileText,
                title: "No saved queries",
                description: "Create your first query using the Query Builder"
              }}
            />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}