import { useState, useEffect } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { Button } from '../shared/Button';
import { DataTable } from '../shared/DataTable';
import { Modal } from '../shared/Modal';
import { supabase } from '../../lib/supabase';

type ReportConfig = {
  name: string;
  description?: string;
  selectedFields?: string[];
  formSpecificCount?: string | null;
  countIfConditions?: {
    id: string;
    field: string;
    operator: string;
    value: string;
  }[];
};

type Props = {
  config: ReportConfig;
  onClose: () => void;
  onExport: () => void;
};

export function ReportPreview({ config, onClose, onExport }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [config]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/academic-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            config: {
              ...config,
              selectedFields: config.selectedFields || [],
              countIfConditions: config.countIfConditions || []
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load report data');
      }

      const result = await response.json();
      console.log('Report Data:', result); // Debug log
      setData(result.results || []);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }

  // Ensure selectedFields exists with a default empty array
  const selectedFields = config.selectedFields || [];

  const columns = [
    {
      header: 'Student',
      accessor: (item: any) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {item.student?.full_name}
          </div>
          <div className="text-sm text-gray-500">
            {item.student?.email}
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: (item: any) => (
        <div className="text-sm text-gray-900">
          {item.type === 'skill' ? 'Lab Skill' : 'Clinical Documentation'}
        </div>
      )
    },
    {
      header: 'Category',
      accessor: (item: any) => (
        <div className="text-sm text-gray-900">{item.category}</div>
      )
    },
    {
      header: config.formSpecificCount ? 'Form Submissions' : 'Total Submissions',
      accessor: (item: any) => (
        <div className="text-sm text-gray-900">
          {item.submission_count !== undefined ? item.submission_count : 'N/A'}
        </div>
      ),
      show: selectedFields.includes('submission_count')
    },
    {
      header: 'Date',
      accessor: (item: any) => (
        <div className="text-sm text-gray-900">
          {new Date(item.date).toLocaleDateString()}
        </div>
      )
    }
  ].filter(col => col.show !== false);

  return (
    <Modal
      title="Report Preview"
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
            {config.description && (
              <p className="mt-1 text-sm text-gray-500">{config.description}</p>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => window.print()}
              icon={<Printer className="h-4 w-4" />}
            >
              Print
            </Button>
            <Button
              onClick={onExport}
              icon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
          </div>
        </div>

        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          error={error}
          emptyState={{
            icon: FileText,
            title: "No data available",
            description: "Try adjusting your report configuration"
          }}
        />
      </div>
    </Modal>
  );
}