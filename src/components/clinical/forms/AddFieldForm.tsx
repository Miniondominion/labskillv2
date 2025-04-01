import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { FormField } from '../../shared/FormField';
import { Modal } from '../../shared/Modal';
import { StatusMessage } from '../../shared/StatusMessage';
import { OptionBubbles } from './OptionBubbles';
import { RichTextEditor } from './RichTextEditor';

type FormFieldType = 'text' | 'longtext' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'checkbox' | 'instructions';

type Props = {
  onSubmit: (field: {
    field_name: string;
    field_type: FormFieldType;
    field_label: string;
    field_content?: string;
    field_options: string[] | null;
    required: boolean;
    order_index: number;
  }) => Promise<void>;
  onClose: () => void;
  orderIndex: number;
  initialData?: any;
  parentField?: { id: string; label: string } | null;
};

export function AddFieldForm({ 
  onSubmit, 
  onClose, 
  orderIndex, 
  initialData, 
  parentField 
}: Props) {
  const [field, setField] = useState({
    field_name: initialData?.field_name || '',
    field_type: initialData?.field_type || 'text' as FormFieldType,
    field_label: initialData?.field_label || '',
    field_content: initialData?.field_content || '',
    field_options: initialData?.field_options || null as string[] | null,
    required: initialData?.required || false,
    order_index: initialData?.order_index || orderIndex
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      // Validate field name (no spaces, special characters)
      const fieldNameRegex = /^[a-zA-Z0-9_]+$/;
      if (!fieldNameRegex.test(field.field_name)) {
        throw new Error('Field name can only contain letters, numbers, and underscores');
      }

      // Validate options for select/multiselect
      if (['select', 'multiselect'].includes(field.field_type) && (!field.field_options || field.field_options.length === 0)) {
        throw new Error('At least one option is required for select fields');
      }

      await onSubmit({
        ...field,
        required: field.field_type === 'instructions' ? false : field.required
      });
    } catch (err) {
      console.error('Error adding field:', err);
      setError(err instanceof Error ? err.message : 'Failed to add field');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={initialData ? "Edit Form Field" : "Add Form Field"} onClose={onClose} zIndex={60}>
      {error && <StatusMessage type="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {parentField && (
          <div className="bg-gray-50 p-3 rounded-md mb-4">
            <p className="text-sm text-gray-500">
              Adding sub-question to: <span className="font-medium text-gray-900">{parentField.label}</span>
            </p>
          </div>
        )}

        <FormField
          label="Label"
          htmlFor="field_label"
          required
        >
          <input
            type="text"
            id="field_label"
            value={field.field_label}
            onChange={(e) => setField({ ...field, field_label: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </FormField>

        <FormField
          label="Field Name"
          htmlFor="field_name"
          required
          hint="Used as the database field name (no spaces or special characters)"
        >
          <input
            type="text"
            id="field_name"
            value={field.field_name}
            onChange={(e) => setField({ ...field, field_name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
            pattern="[a-zA-Z0-9_]+"
          />
        </FormField>

        <FormField
          label="Field Type"
          htmlFor="field_type"
          required
        >
          <select
            id="field_type"
            value={field.field_type}
            onChange={(e) => setField({
              ...field,
              field_type: e.target.value as FormFieldType,
              field_options: ['select', 'multiselect'].includes(e.target.value) ? [] : null,
              required: e.target.value === 'instructions' ? false : field.required
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="text">Text</option>
            <option value="longtext">Long Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="time">Time</option>
            <option value="select">Single Select</option>
            <option value="multiselect">Multi Select</option>
            <option value="checkbox">Checkbox</option>
            <option value="instructions">Instructions</option>
          </select>
        </FormField>

        {field.field_type === 'instructions' && (
          <FormField
            label="Instructions Content"
            htmlFor="field_content"
            required
          >
            <RichTextEditor
              value={field.field_content}
              onChange={(value) => setField({ ...field, field_content: value })}
            />
          </FormField>
        )}

        {['select', 'multiselect'].includes(field.field_type) && (
          <FormField
            label="Options"
            htmlFor="field_options"
            required
          >
            <OptionBubbles
              options={field.field_options || []}
              onChange={(options) => setField({ ...field, field_options: options })}
            />
          </FormField>
        )}

        {field.field_type !== 'instructions' && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={field.required}
              onChange={(e) => setField({ ...field, required: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
              Required field
            </label>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
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
                {initialData ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              initialData ? 'Update Field' : 'Add Field'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}