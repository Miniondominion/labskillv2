import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Filter, Settings, Download, Save } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Select } from '../shared/Select';
import { FormField } from '../shared/FormField';
import { StatusMessage } from '../shared/StatusMessage';
import { ReportPreview } from './ReportPreview';

type ReportConfig = {
  name: string;
  description: string;
  dataPoints: string[];
  filters: any[];
  columns: string[];
  groupBy: string[];
  sortBy: string[];
  customQueries: any[];
};

export function CustomReportGenerator() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    dataPoints: [],
    filters: [],
    columns: [],
    groupBy: [],
    sortBy: [],
    customQueries: []
  });

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate config
      if (!reportConfig.name) {
        throw new Error('Report name is required');
      }

      if (reportConfig.dataPoints.length === 0) {
        throw new Error('At least one data point must be selected');
      }

      // Generate report
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ config: reportConfig })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setShowPreview(true);
      setSuccess('Report generated successfully');
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Report Generator</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create custom reports with advanced filtering and aggregation
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
            onClick={handleGenerateReport}
            loading={loading}
            icon={<FileText className="h-4 w-4" />}
          >
            Generate Report
          </Button>
        </div>
      </div>

      {error && <StatusMessage type="error" message={error} />}
      {success && <StatusMessage type="success" message={success} />}

      <Card>
        <div className="space-y-6 p-6">
          {/* Basic Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Report Name"
              htmlFor="reportName"
              required
            >
              <input
                type="text"
                id="reportName"
                value={reportConfig.name}
                onChange={(e) => setReportConfig({ ...reportConfig, name: e.target.value })}
                className="form-input block w-full rounded-lg"
                placeholder="Enter report name..."
                required
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="description"
            >
              <input
                type="text"
                id="description"
                value={reportConfig.description}
                onChange={(e) => setReportConfig({ ...reportConfig, description: e.target.value })}
                className="form-input block w-full rounded-lg"
                placeholder="Enter report description..."
              />
            </FormField>
          </div>

          {/* Data Points */}
          <FormField
            label="Data Points"
            htmlFor="dataPoints"
            required
          >
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportConfig.dataPoints.includes('skills')}
                  onChange={(e) => {
                    const newDataPoints = e.target.checked
                      ? [...reportConfig.dataPoints, 'skills']
                      : reportConfig.dataPoints.filter(d => d !== 'skills');
                    setReportConfig({ ...reportConfig, dataPoints: newDataPoints });
                  }}
                  className="form-checkbox h-4 w-4 text-indigo-600"
                />
                <span className="ml-2">Lab Skills</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportConfig.dataPoints.includes('clinical')}
                  onChange={(e) => {
                    const newDataPoints = e.target.checked
                      ? [...reportConfig.dataPoints, 'clinical']
                      : reportConfig.dataPoints.filter(d => d !== 'clinical');
                    setReportConfig({ ...reportConfig, dataPoints: newDataPoints });
                  }}
                  className="form-checkbox h-4 w-4 text-indigo-600"
                />
                <span className="ml-2">Clinical Documentation</span>
              </label>
            </div>
          </FormField>

          {/* Group By */}
          <FormField
            label="Group By"
            htmlFor="groupBy"
          >
            <Select
              value={reportConfig.groupBy[0] || ''}
              onChange={(value) => setReportConfig({ ...reportConfig, groupBy: [value] })}
              options={[
                { value: '', label: 'No grouping' },
                { value: 'student', label: 'Student' },
                { value: 'category', label: 'Category' },
                { value: 'status', label: 'Status' }
              ]}
            />
          </FormField>

          {/* Sort By */}
          <FormField
            label="Sort By"
            htmlFor="sortBy"
          >
            <Select
              value={reportConfig.sortBy[0] || ''}
              onChange={(value) => setReportConfig({ ...reportConfig, sortBy: [value] })}
              options={[
                { value: '', label: 'No sorting' },
                { value: 'date', label: 'Date' },
                { value: 'student', label: 'Student Name' },
                { value: 'category', label: 'Category' }
              ]}
            />
          </FormField>
        </div>
      </Card>

      {/* Preview Modal */}
      {showPreview && (
        <ReportPreview
          config={reportConfig}
          onClose={() => setShowPreview(false)}
          onExport={() => {
            // Export logic here
          }}
        />
      )}
    </div>
  );
}