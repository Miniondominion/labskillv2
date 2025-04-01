import { useState, useEffect } from 'react';
import { ClipboardList, FileText, Plus, Clock, X, Loader2, FileCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useClinical } from '../../contexts/ClinicalContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../shared/PageHeader';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { EmptyState } from '../shared/EmptyState';
import { Badge } from '../shared/Badge';
import { StatusMessage } from '../shared/StatusMessage';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { DynamicFormField } from './forms/DynamicFormField';

type NewShiftData = {
  location: string;
  department: string;
  shiftStart: string;
  shiftEnd: string;
  preceptorName: string;
  preceptorCredentials?: string;
  preceptorEmail?: string;
};

type ActiveShift = {
  id: string;
  location: string;
  department: string;
  shift_start: string;
  shift_end: string;
  preceptor_name: string;
  preceptor_credentials?: string;
  preceptor_email?: string;
  is_active: boolean;
  forms: {
    id: string;
    type: string;
    submittedAt: string;
  }[];
};

type FormDraft = {
  id: string;
  form_id: string;
  form_data: Record<string, any>;
  expires_at: string;
};

export default function StudentClinicalView() {
  const { user } = useAuth();
  const { clinicalTypes, forms, formFields, loading: contextLoading, error: contextError, submitEntry } = useClinical();
  const [showNewShift, setShowNewShift] = useState(false);
  const [showFormSelection, setShowFormSelection] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [newShiftData, setNewShiftData] = useState<NewShiftData>({
    location: '',
    department: '',
    shiftStart: '',
    shiftEnd: '',
    preceptorName: '',
    preceptorCredentials: '',
    preceptorEmail: ''
  });
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<FormDraft[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    if (user) {
      loadActiveShift();
      loadDrafts();
    }
  }, [user]);

  async function loadActiveShift() {
    try {
      if (!user) return;

      const { data: shiftData, error: shiftError } = await supabase
        .from('clinical_shifts')
        .select('*')
        .eq('student_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (shiftError) throw shiftError;

      if (shiftData) {
        const { data: shiftEntries, error: entriesError } = await supabase
          .from('clinical_entries')
          .select(`
            id,
            clinical_type:clinical_types (
              name
            ),
            submitted_at
          `)
          .eq('student_id', user.id)
          .gte('submitted_at', shiftData.shift_start)
          .lte('submitted_at', shiftData.shift_end)
          .order('submitted_at', { ascending: false });

        if (entriesError) throw entriesError;

        setActiveShift({
          ...shiftData,
          forms: (shiftEntries || []).map(entry => ({
            id: entry.id,
            type: entry.clinical_type?.name || 'Unknown',
            submittedAt: entry.submitted_at
          }))
        });
      }
    } catch (err) {
      console.error('Error loading active shift:', err);
      setError('Failed to load active shift');
    } finally {
      setLoading(false);
    }
  }

  async function loadDrafts() {
    try {
      if (!user) return;

      const { data: draftsData, error: draftsError } = await supabase
        .from('clinical_entry_drafts')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (draftsError) throw draftsError;
      setDrafts(draftsData || []);
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError('Failed to load drafts');
    }
  }

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSubmitting(true);
      setError(null);

      const start = new Date(newShiftData.shiftStart);
      const end = new Date(newShiftData.shiftEnd);
      if (end < start) {
        throw new Error('Shift end time must be after start time');
      }

      const { data: shiftData, error: shiftError } = await supabase
        .from('clinical_shifts')
        .insert([{
          student_id: user.id,
          location: newShiftData.location,
          department: newShiftData.department,
          shift_start: newShiftData.shiftStart,
          shift_end: newShiftData.shiftEnd,
          preceptor_name: newShiftData.preceptorName,
          preceptor_credentials: newShiftData.preceptorCredentials || null,
          preceptor_email: newShiftData.preceptorEmail || null,
          is_active: true
        }])
        .select()
        .single();

      if (shiftError) throw shiftError;

      setActiveShift({
        ...shiftData,
        forms: []
      });

      setSuccess('Clinical shift started successfully');
      setShowNewShift(false);
      setNewShiftData({
        location: '',
        department: '',
        shiftStart: '',
        shiftEnd: '',
        preceptorName: '',
        preceptorCredentials: '',
        preceptorEmail: ''
      });
    } catch (err) {
      console.error('Error starting clinical shift:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start clinical shift');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !selectedForm || !activeShift) return;

    try {
      setSavingDraft(true);
      setError(null);

      const existingDraft = drafts.find(d => d.form_id === selectedForm);

      if (existingDraft) {
        const { error: updateError } = await supabase
          .from('clinical_entry_drafts')
          .update({
            form_data: formResponses,
            expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', existingDraft.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('clinical_entry_drafts')
          .insert([{
            student_id: user.id,
            clinical_type_id: selectedType,
            form_id: selectedForm,
            form_data: formResponses
          }]);

        if (insertError) throw insertError;
      }

      setSuccess('Form draft saved successfully');
      await loadDrafts();
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleLoadDraft = async (draft: FormDraft) => {
    try {
      const form = forms.find(f => f.id === draft.form_id);
      if (!form) throw new Error('Form not found');

      setSelectedType(form.clinical_type_id);
      setSelectedForm(form.id);
      setFormResponses(draft.form_data);
      setShowFormSelection(true);
    } catch (err) {
      console.error('Error loading draft:', err);
      setError('Failed to load draft');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeShift || !selectedType || !selectedForm) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const formFieldsList = formFields[selectedForm] || [];

      const missingRequired = formFieldsList.find(
        field => field.required && !formResponses[field.field_name]
      );

      if (missingRequired) {
        throw new Error(`Please fill in required field: ${missingRequired.field_label}`);
      }

      await submitEntry({
        student_id: user.id,
        clinical_type_id: selectedType,
        form_id: selectedForm,
        shift_start: activeShift.shift_start,
        shift_end: activeShift.shift_end,
        preceptor_name: activeShift.preceptor_name,
        preceptor_credentials: activeShift.preceptor_credentials || undefined,
        preceptor_email: activeShift.preceptor_email || undefined,
        form_data: formResponses
      });

      const existingDraft = drafts.find(d => d.form_id === selectedForm);
      if (existingDraft) {
        await supabase
          .from('clinical_entry_drafts')
          .delete()
          .eq('id', existingDraft.id);
      }

      setActiveShift(prev => {
        if (!prev) return null;
        return {
          ...prev,
          forms: [
            ...prev.forms,
            {
              id: crypto.randomUUID(),
              type: clinicalTypes.find(t => t.id === selectedType)?.name || 'Unknown',
              submittedAt: new Date().toISOString()
            }
          ]
        };
      });

      setSuccess('Form submitted successfully');
      setShowFormSelection(false);
      setSelectedType(null);
      setSelectedForm(null);
      setFormResponses({});
      await loadDrafts();
    } catch (err) {
      console.error('Error submitting form:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to submit form');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;
    if (!window.confirm('Are you sure you want to end this shift? You won\'t be able to add more forms after ending.')) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('clinical_shifts')
        .update({ is_active: false })
        .eq('id', activeShift.id);

      if (updateError) throw updateError;

      setActiveShift(null);
      setSuccess('Clinical shift ended successfully');
    } catch (err) {
      console.error('Error ending shift:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to end shift');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormButtons = () => (
    <div className="flex justify-end space-x-3">
      <Button
        variant="secondary"
        onClick={handleSaveDraft}
        disabled={savingDraft}
        loading={savingDraft}
      >
        Save as Draft
      </Button>
      <Button
        type="submit"
        disabled={submitting}
        loading={submitting}
      >
        Submit Form
      </Button>
    </div>
  );

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Documentation"
        description="Document and track your clinical experiences"
        icon={ClipboardList}
        action={
          !activeShift && (
            <Button
              onClick={() => setShowNewShift(true)}
              icon={<Plus className="h-4 w-4" />}
            >
              Start Clinical Shift
            </Button>
          )
        }
      />

      {contextError && <StatusMessage type="error" message={contextError} />}
      {error && <StatusMessage type="error" message={error} />}
      {success && <StatusMessage type="success" message={success} />}

      {activeShift && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Active Shift</h3>
              <div className="flex items-center space-x-3">
                <Badge variant="green">In Progress</Badge>
                <Button
                  variant="danger"
                  onClick={handleEndShift}
                >
                  End Shift
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium">{activeShift.location}</p>
              </div>
              <div>
                <p className="text-gray-500">Department</p>
                <p className="font-medium">{activeShift.department}</p>
              </div>
              <div>
                <p className="text-gray-500">Shift Start</p>
                <p className="font-medium">
                  {new Date(activeShift.shift_start).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Shift End</p>
                <p className="font-medium">
                  {new Date(activeShift.shift_end).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Preceptor</p>
                <p className="font-medium">{activeShift.preceptor_name}</p>
              </div>
              {activeShift.preceptor_credentials && (
                <div>
                  <p className="text-gray-500">Credentials</p>
                  <p className="font-medium">{activeShift.preceptor_credentials}</p>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Submitted Forms ({activeShift.forms.length})
                </h4>
                <Button
                  onClick={() => setShowFormSelection(true)}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Add Form
                </Button>
              </div>
              
              {activeShift.forms.length > 0 ? (
                <div className="space-y-3">
                  {activeShift.forms.map(form => (
                    <div 
                      key={form.id}
                      className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{form.type}</p>
                        <p className="text-sm text-gray-500">
                          Submitted {new Date(form.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="green">Submitted</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No forms submitted yet. Click "Add Form" to submit documentation.
                </p>
              )}
            </div>

            {drafts.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">
                  Saved Drafts ({drafts.length})
                </h4>
                <div className="space-y-3">
                  {drafts.map(draft => {
                    const form = forms.find(f => f.id === draft.form_id);
                    const expiresIn = Math.ceil((new Date(draft.expires_at).getTime() - Date.now()) / (1000 * 60 * 60));
                    
                    return (
                      <div 
                        key={draft.id}
                        className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{form?.name || 'Unknown Form'}</p>
                          <p className="text-sm text-gray-500">
                            Expires in {expiresIn} hours
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => handleLoadDraft(draft)}
                        >
                          Continue Editing
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {showFormSelection && (
        <Modal
          title="Add Clinical Documentation"
          onClose={() => {
            setShowFormSelection(false);
            setSelectedType(null);
            setSelectedForm(null);
            setFormResponses({});
          }}
          size="xl"
          footer={selectedType && selectedForm ? renderFormButtons() : undefined}
        >
          <div className="space-y-6">
            {!selectedType && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">
                  Select Documentation Type
                </h4>
                <div className="space-y-3">
                  {clinicalTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <h5 className="text-sm font-medium text-gray-900">
                        {type.name}
                      </h5>
                      {type.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {type.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedType && !selectedForm && (
              <div>
                <button
                  onClick={() => setSelectedType(null)}
                  className="mb-4 text-sm text-indigo-600 hover:text-indigo-900 flex items-center"
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Back to Types
                </button>

                <h4 className="text-sm font-medium text-gray-900 mb-4">
                  Select Form
                </h4>
                <div className="space-y-3">
                  {forms
                    .filter(form => form.clinical_type_id === selectedType)
                    .map((form) => (
                      <button
                        key={form.id}
                        onClick={() => setSelectedForm(form.id)}
                        className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <h5 className="text-sm font-medium text-gray-900">
                          {form.name}
                        </h5>
                        {form.description && (
                          <p className="mt-1 text-sm text-gray-500">
                            {form.description}
                          </p>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {selectedType && selectedForm && (
              <form onSubmit={handleSubmitForm} className="space-y-6">
                <button
                  type="button"
                  onClick={() => setSelectedForm(null)}
                  className="mb-4 text-sm text-indigo-600 hover:text-indigo-900 flex items-center"
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Back to Forms
                </button>

                {formFields[selectedForm]?.map((field) => (
                  <DynamicFormField
                    key={field.id}
                    id={field.field_name}
                    label={field.field_label}
                    type={field.field_type}
                    required={field.required}
                    options={field.field_options || undefined}
                    value={formResponses[field.field_name]}
                    onChange={(value) => setFormResponses({
                      ...formResponses,
                      [field.field_name]: value
                    })}
                  />
                ))}
              </form>
            )}
          </div>
        </Modal>
      )}

      {!activeShift && (
        <EmptyState
          icon={FileText}
          title="No clinical documentation yet"
          description="Start by documenting your first clinical shift"
          action={{
            label: 'Start Clinical Shift',
            onClick: () => setShowNewShift(true),
            icon: Plus
          }}
        />
      )}

      {showNewShift && (
        <Modal
          title="Start Clinical Shift"
          onClose={() => setShowNewShift(false)}
          size="xl"
        >
          <form onSubmit={handleStartShift} className="space-y-6">
            <FormField
              label="Location/Facility"
              htmlFor="location"
              required
            >
              <input
                type="text"
                id="location"
                value={newShiftData.location}
                onChange={(e) => setNewShiftData({ ...newShiftData, location: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </FormField>

            <FormField
              label="Department"
              htmlFor="department"
              required
            >
              <input
                type="text"
                id="department"
                value={newShiftData.department}
                onChange={(e) => setNewShiftData({ ...newShiftData, department: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Shift Start"
                htmlFor="shiftStart"
                required
              >
                <input
                  type="datetime-local"
                  id="shiftStart"
                  value={newShiftData.shiftStart}
                  onChange={(e) => setNewShiftData({ ...newShiftData, shiftStart: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </FormField>

              <FormField
                label="Shift End"
                htmlFor="shiftEnd"
                required
              >
                <input
                  type="datetime-local"
                  id="shiftEnd"
                  value={newShiftData.shiftEnd}
                  min={newShiftData.shiftStart}
                  onChange={(e) => setNewShiftData({ ...newShiftData, shiftEnd: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </FormField>
            </div>

            <FormField
              label="Preceptor Name"
              htmlFor="preceptorName"
              required
            >
              <input
                type="text"
                id="preceptorName"
                value={newShiftData.preceptorName}
                onChange={(e) => setNewShiftData({ ...newShiftData, preceptorName: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </FormField>

            <FormField
              label="Preceptor Credentials"
              htmlFor="preceptorCredentials"
            >
              <input
                type="text"
                id="preceptorCredentials"
                value={newShiftData.preceptorCredentials}
                onChange={(e) => setNewShiftData({ ...newShiftData, preceptorCredentials: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., RN, MD, EMT-P"
              />
            </FormField>

            <FormField
              label="Preceptor Email"
              htmlFor="preceptorEmail"
            >
              <input
                type="email"
                id="preceptorEmail"
                value={newShiftData.preceptorEmail}
                onChange={(e) => setNewShiftData({ ...newShiftData, preceptorEmail: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="preceptor@example.com"
              />
            </FormField>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowNewShift(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                loading={submitting}
              >
                Start Shift
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}