import { useState } from 'react';
import { Plus, Loader2, Trash2, Eye, Pencil, ListTree, ChevronDown, ChevronUp } from 'lucide-react';
import { useClinical } from '../../contexts/ClinicalContext';
import { Modal } from '../shared/Modal';
import { StatusMessage } from '../shared/StatusMessage';
import { AddFieldForm } from './forms/AddFieldForm';
import { ClinicalFormPreview } from './forms/ClinicalFormPreview';

type ClinicalType = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type Props = {
  clinicalType: ClinicalType;
  onClose: () => void;
};

export function ClinicalFormConfig({ clinicalType, onClose }: Props) {
  const { forms, formFields, loading, error: contextError, addFormField, deleteFormField, updateFormField } = useClinical();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingField, setEditingField] = useState<any | null>(null);
  const [addingSubquestionFor, setAddingSubquestionFor] = useState<any | null>(null);
  const [collapsedFields, setCollapsedFields] = useState<Set<string>>(new Set());

  // Get the form for this clinical type
  const form = forms.find(f => f.clinical_type_id === clinicalType.id);
  const fields = form ? formFields[form.id] || [] : [];

  // Organize fields into a hierarchy
  const fieldHierarchy = fields.reduce((acc: any[], field: any) => {
    if (!field.parent_field_id) {
      // This is a top-level field
      acc.push({
        ...field,
        subquestions: fields.filter(f => f.parent_field_id === field.id)
      });
    }
    return acc;
  }, []);

  const toggleFieldCollapse = (fieldId: string) => {
    setCollapsedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  async function handleDeleteField(fieldId: string) {
    if (!confirm('Are you sure you want to delete this field? This will also delete any subquestions.')) return;

    try {
      setError(null);
      await deleteFormField(fieldId);
      setSuccess('Field deleted successfully');
    } catch (err) {
      console.error('Error deleting field:', err);
      setError('Failed to delete field');
    }
  }

  async function handleAddField(fieldData: any) {
    try {
      setError(null);
      
      if (!form) {
        throw new Error('No form found for this clinical type');
      }

      // Create the new field with proper form_id and parent relationship
      const newField = {
        ...fieldData,
        form_id: form.id,
        parent_field_id: addingSubquestionFor?.id || null
      };

      await addFormField(form.id, newField);
      setSuccess('Field added successfully');
      setShowAddField(false);
      setAddingSubquestionFor(null);
    } catch (err) {
      console.error('Error adding field:', err);
      setError(err instanceof Error ? err.message : 'Failed to add field');
    }
  }

  async function handleEditField(field: any) {
    try {
      setError(null);
      if (!form) return;
      await updateFormField(field.id, field);
      setSuccess('Field updated successfully');
      setEditingField(null);
    } catch (err) {
      console.error('Error updating field:', err);
      setError('Failed to update field');
    }
  }

  const handleAddFieldClick = () => {
    setEditingField(null);
    setAddingSubquestionFor(null);
    setShowAddField(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <Modal 
      title={`Configure ${clinicalType.name} Form`} 
      onClose={onClose}
      size="xl"
    >
      {contextError && <StatusMessage type="error" message={contextError} />}
      {error && <StatusMessage type="error" message={error} />}
      {success && <StatusMessage type="success" message={success} />}

      <div className="space-y-6">
        {/* Form Fields */}
        <div className="space-y-4">
          {fieldHierarchy.map((field) => (
            <div key={field.id} className="bg-gray-50 rounded-lg overflow-hidden">
              <div 
                className={`p-4 ${field.subquestions?.length ? 'cursor-pointer hover:bg-gray-100' : ''} transition-colors`}
                onClick={() => field.subquestions?.length && toggleFieldCollapse(field.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center">
                      {field.subquestions?.length > 0 && (
                        <button 
                          className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFieldCollapse(field.id);
                          }}
                        >
                          {collapsedFields.has(field.id) ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronUp className="h-5 w-5" />
                          )}
                        </button>
                      )}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {field.field_label}
                        </h4>
                        <p className="mt-1 text-sm text-gray-500">
                          Type: {field.field_type}
                          {field.required && ' (Required)'}
                        </p>
                      </div>
                    </div>

                    {field.field_options && !collapsedFields.has(field.id) && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Options:</p>
                        <ul className="mt-1 pl-5 text-sm text-gray-500 list-disc">
                          {field.field_options.map((option: string, i: number) => (
                            <li key={i}>{option}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingSubquestionFor(field);
                        setShowAddField(true);
                      }}
                      className="inline-flex items-center px-2 py-1 text-sm border border-indigo-300 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Add subquestion"
                    >
                      <ListTree className="h-4 w-4 mr-1" />
                      Add Subquestion
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingField(field);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
                      title="Edit field"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteField(field.id);
                      }}
                      className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                      title="Delete field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Subquestions */}
              {field.subquestions?.length > 0 && !collapsedFields.has(field.id) && (
                <div className="border-t border-gray-200 bg-white">
                  <div className="p-4 space-y-4">
                    {field.subquestions.map((subquestion: any) => (
                      <div key={subquestion.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">
                              {subquestion.field_label}
                            </h5>
                            <p className="mt-1 text-sm text-gray-500">
                              Type: {subquestion.field_type}
                              {subquestion.required && ' (Required)'}
                            </p>
                            {subquestion.field_options && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-500">Options:</p>
                                <ul className="mt-1 pl-5 text-sm text-gray-500 list-disc">
                                  {subquestion.field_options.map((option: string, i: number) => (
                                    <li key={i}>{option}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingField(subquestion)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteField(subquestion.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {fields.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-4">
              No fields defined yet
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Form
          </button>

          <button
            onClick={handleAddFieldClick}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </button>
        </div>
      </div>

      {/* Add/Edit Field Modal */}
      {(showAddField || editingField || addingSubquestionFor) && form && (
        <AddFieldForm
          onSubmit={async (fieldData) => {
            try {
              if (editingField) {
                await handleEditField({ ...fieldData, id: editingField.id });
              } else {
                await handleAddField(fieldData);
              }
              setShowAddField(false);
              setEditingField(null);
              setAddingSubquestionFor(null);
            } catch (err) {
              // Error is already handled in the respective functions
              return;
            }
          }}
          onClose={() => {
            setShowAddField(false);
            setEditingField(null);
            setAddingSubquestionFor(null);
          }}
          orderIndex={fields.length}
          initialData={editingField}
          parentField={addingSubquestionFor ? {
            id: addingSubquestionFor.id,
            label: addingSubquestionFor.field_label
          } : null}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <ClinicalFormPreview
          fields={fields}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Modal>
  );
}