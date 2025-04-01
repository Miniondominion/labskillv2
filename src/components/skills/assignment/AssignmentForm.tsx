import { Users, Loader2 } from 'lucide-react';

type Props = {
  selectedStudents: string[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  submitting: boolean;
};

export function AssignmentForm({ selectedStudents, onSubmit, submitting }: Props) {
  return (
    <div className="flex justify-end mt-6">
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Assigning...
          </>
        ) : (
          <>
            <Users className="h-4 w-4 mr-2" />
            Assign to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
          </>
        )}
      </button>
    </div>
  );
}