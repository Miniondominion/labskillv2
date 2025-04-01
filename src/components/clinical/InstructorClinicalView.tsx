import { useState, useEffect } from 'react';
import { ClipboardList, FileText, Users, Eye, Settings } from 'lucide-react';
import { useClinical } from '../../contexts/ClinicalContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../shared/PageHeader';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { DataTable } from '../shared/DataTable';
import { Modal } from '../shared/Modal';
import { StatusMessage } from '../shared/StatusMessage';
import { InstructorSubmissionsView } from './InstructorSubmissionsView';
import { chunkArray } from '../../lib/utils';

type Student = {
  id: string;
  full_name: string;
  email: string;
};

type FormAssignment = {
  id: string;
  student_id: string | null;
  form_id: string;
  status: 'active' | 'inactive';
  student?: {
    full_name: string;
    email: string;
  };
  form?: {
    name: string;
    clinical_type: {
      name: string;
    };
  };
};

type ClinicalEntry = {
  id: string;
  student_id: string;
  clinical_type_id: string;
  form_id: string;
  shift_start: string;
  shift_end: string;
  preceptor_name: string;
  preceptor_credentials?: string;
  preceptor_email?: string;
  form_data: Record<string, any>;
  submitted_at: string;
  student: {
    full_name: string;
    email: string;
  };
  clinical_type: {
    name: string;
  };
  form: {
    name: string;
  };
};

export default function InstructorClinicalView() {
  const { user } = useAuth();
  const { clinicalTypes, forms, formFields, loading, error: contextError } = useClinical();
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [entries, setEntries] = useState<ClinicalEntry[]>([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'submissions'>('submissions');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    try {
      if (!user) return;

      // Load affiliated students
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('affiliated_instructor', user.id)
        .eq('role', 'student')
        .order('full_name');

      if (studentsError) throw studentsError;

      // Load form assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('clinical_form_assignments')
        .select(`
          id,
          student_id,
          form_id,
          status,
          student:profiles!clinical_form_assignments_student_id_fkey (
            full_name,
            email
          ),
          form:clinical_forms (
            name,
            clinical_type:clinical_types (
              name
            )
          )
        `)
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Load clinical entries only if we have students
      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map(s => s.id);
        const chunks = chunkArray(studentIds, 10); // Process in chunks of 10
        let allEntries: ClinicalEntry[] = [];

        // Fetch entries for each chunk
        for (const chunk of chunks) {
          const { data: entriesData, error: entriesError } = await supabase
            .from('clinical_entries')
            .select(`
              id,
              student_id,
              clinical_type_id,
              form_id,
              shift_start,
              shift_end,
              preceptor_name,
              preceptor_credentials,
              preceptor_email,
              form_data,
              submitted_at,
              student:profiles!clinical_entries_student_id_fkey (
                full_name,
                email
              ),
              clinical_type:clinical_types (
                name
              ),
              form:clinical_forms (
                name
              )
            `)
            .in('student_id', chunk)
            .order('submitted_at', { ascending: false });

          if (entriesError) throw entriesError;
          if (entriesData) {
            allEntries = [...allEntries, ...entriesData];
          }
        }

        setEntries(allEntries);
      } else {
        setEntries([]);
      }

      setStudents(studentsData || []);
      setAssignments(assignmentsData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setLocalError('Failed to load data');
    }
  }

  async function handleAssignForm(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedForm || selectedStudents.length === 0) return;

    try {
      setSubmitting(true);
      setLocalError(null);
      setSuccess(null);

      const assignments = selectedStudents.map(studentId => ({
        form_id: selectedForm,
        instructor_id: user?.id,
        student_id: studentId,
        status: 'active'
      }));

      const { error: assignError } = await supabase
        .from('clinical_form_assignments')
        .insert(assignments);

      if (assignError) throw assignError;

      setSuccess('Form assigned successfully');
      setShowAssignForm(false);
      setSelectedStudents([]);
      setSelectedForm('');
      await loadData();
    } catch (err) {
      console.error('Error assigning form:', err);
      setLocalError('Failed to assign form');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Documentation"
        description="Manage clinical documentation forms and assignments"
        icon={ClipboardList}
        action={
          <Button
            onClick={() => setShowAssignForm(true)}
            icon={<Users className="h-4 w-4" />}
          >
            Assign Form
          </Button>
        }
      />

      {contextError && <StatusMessage type="error" message={contextError} />}
      {localError && <StatusMessage type="error" message={localError} />}
      {success && <StatusMessage type="success" message={success} />}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card>
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-blue-600" />
            <div className="ml-5">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Available Forms
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {forms.length}
              </dd>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <Users className="h-6 w-6 text-green-600" />
            <div className="ml-5">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Assigned Students
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {students.length}
              </dd>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <ClipboardList className="h-6 w-6 text-purple-600" />
            <div className="ml-5">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Entries
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {entries.length}
              </dd>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('submissions')}
              className={`${
                activeTab === 'submissions'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              Submissions
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`${
                activeTab === 'assignments'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              Form Assignments
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'submissions' ? (
            <InstructorSubmissionsView 
              entries={entries}
              formFields={formFields}
            />
          ) : (
            <DataTable
              data={assignments}
              columns={[
                {
                  header: 'Student',
                  accessor: (assignment: FormAssignment) => (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.student?.full_name || 'All Students'}
                      </div>
                      {assignment.student?.email && (
                        <div className="text-sm text-gray-500">{assignment.student.email}</div>
                      )}
                    </div>
                  )
                },
                {
                  header: 'Form',
                  accessor: (assignment: FormAssignment) => (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.form?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.form?.clinical_type.name}
                      </div>
                    </div>
                  )
                },
                {
                  header: 'Status',
                  accessor: (assignment: FormAssignment) => (
                    <Badge
                      variant={assignment.status === 'active' ? 'green' : 'gray'}
                    >
                      {assignment.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  )
                },
                {
                  header: 'Actions',
                  accessor: (assignment: FormAssignment) => (
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye className="h-4 w-4" />}
                        onClick={() => {
                          // TODO: Implement form preview
                        }}
                      >
                        Preview
                      </Button>
                    </div>
                  )
                }
              ]}
              emptyState={{
                icon: ClipboardList,
                title: "No form assignments",
                description: "Start by assigning a form to your students"
              }}
            />
          )}
        </div>
      </div>

      {/* Assign Form Modal */}
      {showAssignForm && (
        <Modal
          title="Assign Clinical Form"
          onClose={() => setShowAssignForm(false)}
        >
          <form onSubmit={handleAssignForm} className="space-y-6">
            {/* Form Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Form
              </label>
              <select
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Choose a form...</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Students
              </label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
                {students.map((student) => (
                  <label key={student.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents([...selectedStudents, student.id]);
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                        }
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {student.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.email}
                      </div>
                    </div>
                  </label>
                ))}

                {students.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No students available
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowAssignForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !selectedForm || selectedStudents.length === 0}
                loading={submitting}
              >
                Assign Form
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}