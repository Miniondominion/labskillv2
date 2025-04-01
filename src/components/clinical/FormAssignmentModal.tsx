import { useState } from 'react';
import { X, Users, Loader2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../shared/Modal';
import { StatusMessage } from '../shared/StatusMessage';

type Props = {
  formId: string;
  formName: string;
  onClose: () => void;
};

type Instructor = {
  id: string;
  full_name: string;
  email: string;
};

export function FormAssignmentModal({ formId, formName, onClose }: Props) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load instructors when search term changes
  const handleSearch = async (term: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'instructor')
        .ilike('full_name', `%${term}%`)
        .order('full_name');

      if (error) throw error;
      setInstructors(data || []);
    } catch (err) {
      console.error('Error searching instructors:', err);
      setError('Failed to load instructors');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const assignments = Array.from(selectedInstructors).map(instructorId => ({
        form_id: formId,
        instructor_id: instructorId,
        status: 'active'
      }));

      const { error } = await supabase
        .from('clinical_form_assignments')
        .insert(assignments);

      if (error) throw error;

      setSuccess('Form assigned successfully');
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error('Error assigning form:', err);
      setError('Failed to assign form');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleInstructor = (instructorId: string) => {
    setSelectedInstructors(prev => {
      const next = new Set(prev);
      if (next.has(instructorId)) {
        next.delete(instructorId);
      } else {
        next.add(instructorId);
      }
      return next;
    });
  };

  return (
    <Modal title={`Assign "${formName}" to Instructors`} onClose={onClose}>
      {error && <StatusMessage type="error" message={error} />}
      {success && <StatusMessage type="success" message={success} />}

      <div className="space-y-6">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Search Instructors
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Search by name..."
            />
          </div>
        </div>

        {/* Instructor List */}
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : instructors.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {instructors.map((instructor) => (
                  <div
                    key={instructor.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {instructor.full_name}
                      </h4>
                      <p className="text-sm text-gray-500">{instructor.email}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedInstructors.has(instructor.id)}
                      onChange={() => toggleInstructor(instructor.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No instructors found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search' : 'Start typing to search instructors'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={selectedInstructors.size === 0 || submitting}
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
                Assign to {selectedInstructors.size} Instructor{selectedInstructors.size !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}