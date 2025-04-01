import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Filter, Settings, Save, Upload, Plus, Search, Trash2, Eye, Edit, ClipboardList } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Select } from '../shared/Select';
import { SearchInput } from '../shared/SearchInput';
import { DataTable } from '../shared/DataTable';
import { StatusMessage } from '../shared/StatusMessage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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

export function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadSavedQueries();
    checkUserRole();
  }, [user]);

  async function checkUserRole() {
    try {
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsAdmin(profile?.role === 'admin');
    } catch (err) {
      console.error('Error checking user role:', err);
    }
  }

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
      if (selectedQuery?.id === queryId) {
        setSelectedQuery(null);
        setQueryResults([]);
      }
    } catch (err) {
      console.error('Error deleting query:', err);
      setError('Failed to delete query');
    }
  }

  async function handleViewQuery(query: SavedQuery) {
    try {
      setQueryLoading(true);
      setError(null);
      setSelectedQuery(query);

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      // Execute the query using the academic-report edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/academic-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ config: query.config })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to execute query');
      }

      const data = await response.json();
      setQueryResults(data.results || []);
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute query');
    } finally {
      setQueryLoading(false);
    }
  }

  const handleExport = () => {
    if (!queryResults.length) return;

    const csvData = queryResults.map(item => ({
      'Date': new Date(item.date).toLocaleDateString(),
      'Type': item.type === 'skill' ? 'Lab Skill' : 'Clinical Documentation',
      'Student': item.student?.full_name || 'Unknown',
      'Title': item.title,
      'Category': item.category,
      'Status': item.status || 'Submitted',
      'Evaluator': item.evaluator_name || item.preceptor_name || 'N/A'
    }));

    const headers = Object.keys(csvData[0]);
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredQueries = savedQueries.filter(query =>
    query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage custom reports
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
                      onClick={() => handleViewQuery(query)}
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

      {/* Query Results */}
      {selectedQuery && (
        <Card>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedQuery.name}</h3>
                {selectedQuery.description && (
                  <p className="mt-1 text-sm text-gray-500">{selectedQuery.description}</p>
                )}
              </div>
              {queryResults.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={handleExport}
                  icon={<Download className="h-4 w-4" />}
                >
                  Export Results
                </Button>
              )}
            </div>

            <DataTable
              data={queryResults}
              columns={[
                {
                  header: 'Date',
                  accessor: (item: any) => (
                    <div className="text-sm text-gray-900">
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                  )
                },
                {
                  header: 'Type',
                  accessor: (item: any) => (
                    <div className="flex items-center">
                      {item.type === 'skill' ? (
                        <FileText className="h-4 w-4 text-blue-500 mr-2" />
                      ) : (
                        <ClipboardList className="h-4 w-4 text-purple-500 mr-2" />
                      )}
                      <span className="text-sm text-gray-900">
                        {item.type === 'skill' ? 'Lab Skill' : 'Clinical Documentation'}
                      </span>
                    </div>
                  )
                },
                {
                  header: 'Student',
                  accessor: (item: any) => (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.student?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.student?.email || 'No email'}
                      </div>
                    </div>
                  )
                },
                {
                  header: 'Title',
                  accessor: (item: any) => (
                    <div>
                      <div className="text-sm text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-500">{item.category}</div>
                    </div>
                  )
                },
                {
                  header: 'Status',
                  accessor: (item: any) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'submitted'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status || 'Submitted'}
                    </span>
                  )
                },
                {
                  header: 'Evaluator',
                  accessor: (item: any) => (
                    <div className="text-sm text-gray-900">
                      {item.evaluator_name || item.preceptor_name || 'N/A'}
                    </div>
                  )
                }
              ]}
              loading={queryLoading}
              emptyState={{
                icon: FileText,
                title: "No results found",
                description: "This query returned no results"
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}