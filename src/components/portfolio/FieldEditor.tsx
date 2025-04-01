import { useState } from 'react';
import { FormField } from '../shared/FormField';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { Database, FileText, Image, Link, ListPlus, Plus, Minus, User } from 'lucide-react';

type FieldType = 'text' | 'longtext' | 'number' | 'date' | 'select' | 'multiselect' | 'file' | 'image' | 'link' | 'skill_list' | 'clinical_list' | 'dynamic';

type DataSource = 'skills' | 'clinical' | 'user' | 'none';
type AggregationType = 'count' | 'sum' | 'average' | 'latest';

type Props = {
  onSave: (field: {
    name: string;
    label: string;
    field_type: FieldType;
    is_required: boolean;
    options?: any;
    validation_rules?: any;
    order_index: number;
  }) => Promise<void>;
  onClose: () => void;
  initialData?: any;
};

export function FieldEditor({ onSave, onClose, initialData }: Props) {
  const [field, setField] = useState({
    name: initialData?.name || '',
    label: initialData?.label || '',
    field_type: initialData?.field_type || 'text',
    is_required: initialData?.is_required ?? true,
    options: initialData?.options || null,
    validation_rules: initialData?.validation_rules || null,
    order_index: initialData?.order_index || 0
  });

  const [dataSource, setDataSource] = useState<DataSource>(
    (initialData?.options?.dataSource as DataSource) || 'none'
  );
  const [dataField, setDataField] = useState(initialData?.options?.dataField || '');
  const [aggregation, setAggregation] = useState<AggregationType>(
    initialData?.options?.aggregation || 'count'
  );
  const [selectOptions, setSelectOptions] = useState<string[]>(
    initialData?.options?.selectOptions || []
  );
  const [isPrivate, setIsPrivate] = useState<boolean>(
    initialData?.options?.isPrivate || false
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate field name (no spaces, special characters)
    const fieldNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!fieldNameRegex.test(field.name)) {
      alert('Field name can only contain letters, numbers, and underscores');
      return;
    }

    // Build options based on field type
    let options = null;
    if (field.field_type === 'dynamic') {
      options = {
        dataSource,
        dataField,
        aggregation
      };
    } else if (['select', 'multiselect'].includes(field.field_type)) {
      options = { selectOptions };
    }

    // Add isPrivate flag if set
    if (isPrivate) {
      options = { ...(options || {}), isPrivate: true };
    }

    await onSave({
      ...field,
      options
    });
  };

  const addSelectOption = () => {
    setSelectOptions([...selectOptions, '']);
  };

  const updateSelectOption = (index: number, value: string) => {
    const newOptions = [...selectOptions];
    newOptions[index] = value;
    setSelectOptions(newOptions);
  };

  const removeSelectOption = (index: number) => {
    setSelectOptions(selectOptions.filter((_, i) => i !== index));
  };

  const dataFields = {
    skills: [
      { value: 'submission_count', label: 'Total Submissions' },
      { value: 'completed_count', label: 'Completed Skills' },
      { value: 'verified_count', label: 'Verified Skills' }
    ],
    clinical: [
      { value: 'total_hours', label: 'Total Hours' },
      { value: 'shift_count', label: 'Number of Shifts' },
      { value: 'patient_count', label: 'Total Patients' }
    ],
    user: [
      { value: 'full_name', label: 'Full Name' },
      { value: 'email', label: 'Email Address' },
      { value: 'role', label: 'User Role' },
      { value: 'created_at', label: 'Account Creation Date' }
    ],
    none: []
  };

  return (
    <Modal
      title={initialData ? "Edit Field" : "Add Field"}
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="Field Name"
          htmlFor="name"
          required
          hint="Use only letters, numbers, and underscores"
        >
          <input
            type="text"
            id="name"
            value={field.name}
            onChange={(e) => setField({ ...field, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
            pattern="[a-zA-Z0-9_]+"
          />
        </FormField>

        <FormField
          label="Label"
          htmlFor="label"
          required
        >
          <input
            type="text"
            id="label"
            value={field.label}
            onChange={(e) => setField({ ...field, label: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </FormField>

        <FormField
          label="Field Type"
          htmlFor="fieldType"
          required
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'text', label: 'Text', icon: FileText },
              { value: 'longtext', label: 'Long Text', icon: FileText },
              { value: 'number', label: 'Number', icon: FileText },
              { value: 'date', label: 'Date', icon: FileText },
              { value: 'select', label: 'Single Select', icon: ListPlus },
              { value: 'multiselect', label: 'Multi Select', icon: ListPlus },
              { value: 'file', label: 'File Upload', icon: Database },
              { value: 'image', label: 'Image Upload', icon: Image },
              { value: 'link', label: 'Link', icon: Link },
              { value: 'dynamic', label: 'Dynamic Data', icon: Database }
            ].map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={`
                  relative flex items-center p-4 cursor-pointer rounded-lg border
                  ${field.field_type === value 
                    ? 'border-indigo-500 ring-2 ring-indigo-500' 
                    : 'border-gray-200 hover:border-indigo-200'}
                `}
              >
                <input
                  type="radio"
                  name="fieldType"
                  value={value}
                  checked={field.field_type === value}
                  onChange={(e) => setField({ ...field, field_type: e.target.value as FieldType })}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <Icon className={`h-5 w-5 mr-2 ${field.field_type === value ? 'text-indigo-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${field.field_type === value ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {label}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </FormField>

        {/* Dynamic Data Configuration */}
        {field.field_type === 'dynamic' && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <FormField
              label="Data Source"
              htmlFor="dataSource"
            >
              <select
                id="dataSource"
                value={dataSource}
                onChange={(e) => {
                  setDataSource(e.target.value as DataSource);
                  setDataField('');
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="none">Select a data source...</option>
                <option value="skills">Lab Skills</option>
                <option value="clinical">Clinical Documentation</option>
                <option value="user">User Profile</option>
              </select>
            </FormField>

            {dataSource !== 'none' && (
              <>
                <FormField
                  label="Data Field"
                  htmlFor="dataField"
                >
                  <select
                    id="dataField"
                    value={dataField}
                    onChange={(e) => setDataField(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a field...</option>
                    {dataFields[dataSource].map(field => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                {dataSource !== 'user' && (
                  <FormField
                    label="Aggregation"
                    htmlFor="aggregation"
                  >
                    <select
                      id="aggregation"
                      value={aggregation}
                      onChange={(e) => setAggregation(e.target.value as AggregationType)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="count">Count</option>
                      <option value="sum">Sum</option>
                      <option value="average">Average</option>
                      <option value="latest">Latest Value</option>
                    </select>
                  </FormField>
                )}
              </>
            )}
          </div>
        )}

        {/* Select/Multiselect Options */}
        {['select', 'multiselect'].includes(field.field_type) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Options</h4>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addSelectOption}
                icon={<Plus className="h-4 w-4" />}
              >
                Add Option
              </Button>
            </div>
            <div className="space-y-2">
              {selectOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateSelectOption(index, e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeSelectOption(index)}
                    icon={<Minus className="h-4 w-4" />}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Setting */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPrivate"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-900">
            Private field (only visible to student and instructors)
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="required"
            checked={field.is_required}
            onChange={(e) => setField({ ...field, is_required: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
            Required field
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Field' : 'Add Field'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}