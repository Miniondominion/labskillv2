import { DashboardLayout } from '../components/DashboardLayout';
import { ClipboardList, FileText, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { ClinicalTypesList } from '../components/clinical/ClinicalTypesList';
import { ClinicalFormConfig } from '../components/clinical/ClinicalFormConfig';
import { useClinical } from '../contexts/ClinicalContext';

type ClinicalType = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export function AdminClinicalDocumentation() {
  const { clinicalTypes, entries, loading, error, refreshData } = useClinical();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<ClinicalType | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleEditType = (type: ClinicalType) => {
    setSelectedType(type);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ClipboardList className="h-6 w-6 mr-2 text-indigo-600" />
              Clinical Documentation Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and review student clinical documentation entries
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Entries
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {entries.length}
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
                  <ClipboardList className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Review
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {entries.filter(e => !e.reviewed_by).length}
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
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Clinical Types
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {clinicalTypes.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Types Management */}
        <ClinicalTypesList onEdit={handleEditType} />

        {/* Form Configuration Modal */}
        {selectedType && (
          <ClinicalFormConfig
            clinicalType={selectedType}
            onClose={() => setSelectedType(null)}
          />
        )}

        {/* Recent Entries */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Entries</h3>
            
            {entries.length > 0 ? (
              <div className="space-y-4">
                {entries.map((entry) => {
                  const type = clinicalTypes.find(t => t.id === entry.clinical_type_id);
                  return (
                    <div key={entry.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {type?.name || 'Unknown Type'}
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            {new Date(entry.shift_start).toLocaleDateString()} - {new Date(entry.shift_end).toLocaleDateString()}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Preceptor: {entry.preceptor_name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {entry.reviewed_by ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Reviewed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending Review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No entries yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Clinical documentation entries will appear here once students begin submitting them
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}