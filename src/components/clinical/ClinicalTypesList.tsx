import { useState } from 'react';
import { Plus, Loader2, Settings, Eye, Users } from 'lucide-react';
import { useClinical } from '../../contexts/ClinicalContext';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { StatusMessage } from '../shared/StatusMessage';
import { ClinicalFormPreview } from './forms/ClinicalFormPreview';
import { FormAssignmentModal } from './FormAssignmentModal';

type ClinicalType = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type Props = {
  onEdit: (type: ClinicalType) => void;
};

export function ClinicalTypesList({ onEdit }: Props) {
  const { clinicalTypes, forms, formFields, loading, error, addClinicalType } = useClinical();
  const [showAddType, setShowAddType] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedType, setSelectedType] = useState<ClinicalType | null>(null);
  const [selectedForm, setSelectedForm] = useState<{id: string; name: string} | null>(null);
  const [newType, setNewType] = useState({
    name: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleAddType(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccess(null);

      await addClinicalType(newType.name, newType.description);

      setSuccess('Clinical type added successfully');
      setShowAddType(false);
      setNewType({ name: '', description: '' });
    } catch (err) {
      console.error('Error adding clinical type:', err);
    } finally {
      setSaving(false);
    }
  }

  const handlePreview = (type: ClinicalType) => {
    setSelectedType(type);
    setShowPreview(true);
  };

  const handleAssign = (form: { id: string; name: string }) => {
    setSelectedForm(form);
    setShowAssign(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <StatusMessage type="error" message={error} />}
      {success && <StatusMessage type="success" message={success} />}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Clinical Types</h3>
            <button
              onClick={() => setShowAddType(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Type
            </button>
          </div>

          <div className="space-y-4">
            {clinicalTypes.map((type) => {
              const typeForm = forms.find(f => f.clinical_type_id === type.id);
              const fields = typeForm ? formFields[typeForm.id] || [] : [];
              
              return (
                <div
                  key={type.id}
                  className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{type.name}</h4>
                    {type.description && (
                      <p className="mt-1 text-sm text-gray-500">{type.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {fields.length} field{fields.length !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    {typeForm && (
                      <>
                        <button
                          onClick={() => handleAssign(typeForm)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Assign
                        </button>
                        <button
                          onClick={() => handlePreview(type)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onEdit(type)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </button>
                  </div>
                </div>
              );
            })}

            {clinicalTypes.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">
                No clinical types defined yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add Type Modal */}
      {showAddType && (
        <Modal title="Add Clinical Type" onClose={() => setShowAddType(false)}>
          <form onSubmit={handleAddType} className="space-y-4">
            <FormField
              label="Name"
              htmlFor="name"
              required
            >
              <input
                type="text"
                id="name"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="description"
            >
              <textarea
                id="description"
                value={newType.description}
                onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </FormField>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddType(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Add Type'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Preview Modal */}
      {showPreview && selectedType && (
        <ClinicalFormPreview
          fields={forms
            .find(f => f.clinical_type_id === selectedType.id)
            ?.id
            ? formFields[forms.find(f => f.clinical_type_id === selectedType.id)!.id] || []
            : []
          }
          onClose={() => {
            setShowPreview(false);
            setSelectedType(null);
          }}
        />
      )}

      {/* Assignment Modal */}
      {showAssign && selectedForm && (
        <FormAssignmentModal
          formId={selectedForm.id}
          formName={selectedForm.name}
          onClose={() => {
            setShowAssign(false);
            setSelectedForm(null);
          }}
        />
      )}
    </div>
  );
}