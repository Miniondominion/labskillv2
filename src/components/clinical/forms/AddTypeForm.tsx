import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FormField } from '../../shared/FormField';
import { Modal } from '../../shared/Modal';
import { StatusMessage } from '../../shared/StatusMessage';

type Props = {
  onSubmit: (name: string, description: string) => Promise<void>;
  onClose: () => void;
};

export function AddTypeForm({ onSubmit, onClose }: Props) {
  const [newType, setNewType] = useState({
    name: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await onSubmit(newType.name, newType.description);
    } catch (err) {
      console.error('Error adding type:', err);
      setError('Failed to add type');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Clinical Type" onClose={onClose}>
      {error && <StatusMessage type="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
  );
}