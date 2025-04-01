import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StudentTable } from '../components/skills/assignment/StudentTable';
import { 
  AlertCircle, Users, CheckCircle, Search, Filter,
  ChevronDown, ChevronUp, Download, Upload, CheckSquare, Square,
  Loader2, BookOpen, Calendar, X
} from 'lucide-react';
import debounce from 'lodash/debounce';
import { retryOperation } from '../lib/utils';

type AssignmentStatus = {
  status: 'pending' | 'completed' | 'expired';
  required_submissions: number;
  completed_submissions: number;
  due_date?: string | null;
};

type Student = {
  id: string;
  full_name: string;
  email: string;
  class_id: string | null;
  assignment?: AssignmentStatus;
};

type Class = {
  id: string;
  name: string;
};

type Skill = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  skill_categories: {
    name: string;
  };
};

export function SkillAssignment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { skillId } = useParams();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unassigned' | 'assigned'>('unassigned');
  const [studentAssignments, setStudentAssignments] = useState<{
    [studentId: string]: {
      requiredSubmissions: number;
      dueDate: string;
    };
  }>({});
  const [unassigning, setUnassigning] = useState<string | null>(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    loadInitialData();
  }, [user, skillId]); 

  useEffect(() => {
    if (selectedSkills.length > 0) {
      loadStudents();
    }
  }, [selectedSkills, searchTerm, selectedClass]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError(null);

      const [skillsResponse, classesResponse] = await Promise.all([
        retryOperation(() =>
          supabase
            .from('skills')
            .select(`
              *,
              skill_categories (
                name
              )
            `)
            .eq('is_template', true)
            .order('name')
        ),
        retryOperation(() =>
          supabase
            .from('classes')
            .select('id, name')
            .eq('instructor_id', user?.id)
            .eq('archived', false)
            .order('name')
        )
      ]);

      if (skillsResponse.error) throw skillsResponse.error;
      if (classesResponse.error) throw classesResponse.error;

      setSkills(skillsResponse.data || []);
      setClasses(classesResponse.data || []);

      // If skillId is provided, find and select that skill
      if (skillId) {
        const skill = skillsResponse.data?.find(s => s.id === skillId);
        if (skill) {
          setSelectedSkills([skill]);
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents(resetPage = true) {
    try {
      if (selectedSkills.length === 0 || !user) return;

      const currentPage = resetPage ? 1 : page;
      const start = (currentPage - 1) * ITEMS_PER_PAGE;

      // First get all students assigned to this instructor
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          class_enrollments (
            class_id
          )
        `)
        .eq('role', 'student')
        .eq('affiliated_instructor', user.id)
        .range(start, start + ITEMS_PER_PAGE - 1);

      if (searchTerm) {
        query = query.ilike('full_name', `%${searchTerm}%`);
      }

      const { data: studentsData, error: studentsError } = await retryOperation(() => query);
      if (studentsError) throw studentsError;

      // Filter by class if needed
      let filteredStudents = studentsData;
      if (selectedClass !== 'all') {
        filteredStudents = studentsData?.filter(student => 
          student.class_enrollments?.some(enrollment => enrollment.class_id === selectedClass)
        ) || [];
      }

      // Get assignments for all selected skills
      const assignmentsPromises = selectedSkills.map(skill =>
        retryOperation(() =>
          supabase
            .from('skill_assignments')
            .select('*')
            .eq('skill_id', skill.id)
        )
      );

      const assignmentsResults = await Promise.all(assignmentsPromises);
      const allAssignments = assignmentsResults.flatMap(result => result.data || []);
      const assignmentsMap = new Map(allAssignments.map(a => [a.student_id, a]));

      const assigned: Student[] = [];
      const unassigned: Student[] = [];

      filteredStudents?.forEach(student => {
        const assignment = assignmentsMap.get(student.id);
        const processedStudent = {
          ...student,
          class_id: student.class_enrollments?.[0]?.class_id || null,
          assignment: assignment ? {
            status: assignment.status,
            required_submissions: assignment.required_submissions,
            completed_submissions: 0,
            due_date: assignment.due_date
          } : undefined
        };

        if (assignment) {
          assigned.push(processedStudent);
        } else {
          unassigned.push(processedStudent);
        }
      });

      setAssignedStudents(resetPage ? assigned : [...assignedStudents, ...assigned]);
      setUnassignedStudents(resetPage ? unassigned : [...unassignedStudents, ...unassigned]);
      setHasMore((assigned.length + unassigned.length) === ITEMS_PER_PAGE);
      if (!resetPage) setPage(currentPage);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students');
    }
  }

  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term);
      loadStudents();
    }, 300),
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSkills.length === 0) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const assignments = selectedSkills.flatMap(skill => 
        selectedStudents.map(studentId => ({
          skill_id: skill.id,
          student_id: studentId,
          required_submissions: studentAssignments[studentId]?.requiredSubmissions || 1,
          due_date: studentAssignments[studentId]?.dueDate || null,
          status: 'pending'
        }))
      );

      const { error } = await retryOperation(() =>
        supabase
          .from('skill_assignments')
          .insert(assignments)
      );

      if (error) throw error;

      await loadStudents();
      setSuccess(`Skills assigned to ${selectedStudents.length} student(s) successfully`);
      setSelectedStudents([]);
      setStudentAssignments({});
    } catch (err) {
      console.error('Error assigning skills:', err);
      setError('Failed to assign skills');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnassignStudent(studentId: string) {
    if (!selectedSkills.length || !window.confirm('Are you sure you want to unassign these skills from the student?')) {
      return;
    }

    try {
      setUnassigning(studentId);
      setError(null);
      setSuccess(null);

      const unassignPromises = selectedSkills.map(skill =>
        retryOperation(() =>
          supabase
            .from('skill_assignments')
            .delete()
            .eq('skill_id', skill.id)
            .eq('student_id', studentId)
        )
      );

      await Promise.all(unassignPromises);

      const student = assignedStudents.find(s => s.id === studentId);
      if (student) {
        const updatedStudent = { ...student };
        delete updatedStudent.assignment;
        
        setAssignedStudents(assignedStudents.filter(s => s.id !== studentId));
        setUnassignedStudents([...unassignedStudents, updatedStudent]);
      }

      setSuccess('Student unassigned successfully');
    } catch (err) {
      console.error('Error unassigning student:', err);
      setError('Failed to unassign student');
    } finally {
      setUnassigning(null);
    }
  }

  const handleExport = () => {
    const data = assignedStudents.map(student => ({
      'Student Name': student.full_name,
      'Email': student.email,
      'Class': classes.find(c => c.id === student.class_id)?.name || 'No Class',
      'Status': student.assignment?.status || 'Not Assigned',
      'Progress': student.assignment ? `${student.assignment.completed_submissions}/${student.assignment.required_submissions}` : 'N/A'
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skill-assignments-${selectedSkills.map(s => s.name).join('-')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assign Skills</h1>
            <p className="mt-1 text-sm text-gray-500">
              Assign skills to students and track their progress
            </p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Skills to Assign
              </label>
              <div className="mt-1 relative">
                <select
                  multiple
                  value={selectedSkills.map(s => s.id)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map(option => 
                      skills.find(s => s.id === option.value)!
                    );
                    setSelectedSkills(selected);
                    setSelectedStudents([]);
                    setStudentAssignments({});
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  size={5}
                >
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.skill_categories.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSkills.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map(skill => (
                    <div key={skill.id} className="flex items-center bg-white px-3 py-1 rounded-full border border-indigo-200">
                      <span className="text-sm text-indigo-700">{skill.name}</span>
                      <button
                        onClick={() => setSelectedSkills(selectedSkills.filter(s => s.id !== skill.id))}
                        className="ml-2 text-indigo-400 hover:text-indigo-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedSkills.length > 0 && (
          <>
            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                    Search Students
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      onChange={(e) => debouncedSearch(e.target.value)}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="Search by name..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="class-filter" className="block text-sm font-medium text-gray-700">
                    Filter by Class
                  </label>
                  <select
                    id="class-filter"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="all">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Status Messages */}
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

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Students Table */}
            <div className="bg-white shadow rounded-lg">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('unassigned')}
                    className={`${
                      activeTab === 'unassigned'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                  >
                    Unassigned Students ({unassignedStudents.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('assigned')}
                    className={`${
                      activeTab === 'assigned'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                  >
                    Assigned Students ({assignedStudents.length})
                  </button>
                </nav>
              </div>

              <div className="p-4">
                <StudentTable
                  students={activeTab === 'unassigned' ? unassignedStudents : assignedStudents}
                  classes={classes}
                  selectedStudents={selectedStudents}
                  studentAssignments={studentAssignments}
                  showCheckboxes={activeTab === 'unassigned'}
                  onSelectStudent={(studentId, selected) => {
                    if (selected) {
                      setSelectedStudents([...selectedStudents, studentId]);
                    } else {
                      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
                    }
                  }}
                  onSelectAll={activeTab === 'unassigned' ? () => {
                    if (selectedStudents.length === unassignedStudents.length) {
                      setSelectedStudents([]);
                    } else {
                      setSelectedStudents(unassignedStudents.map(s => s.id));
                    }
                  } : undefined}
                  onUnassignStudent={activeTab === 'assigned' ? handleUnassignStudent : undefined}
                  onExport={activeTab === 'assigned' ? handleExport : undefined}
                  setStudentAssignments={setStudentAssignments}
                  submitting={submitting}
                  unassigning={unassigning}
                  searchTerm={searchTerm}
                  onSearchChange={(term) => debouncedSearch(term)}
                  selectedClass={selectedClass}
                  onClassChange={setSelectedClass}
                  showClassDropdown={showClassDropdown}
                  setShowClassDropdown={setShowClassDropdown}
                />

                {hasMore && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => loadStudents(false)}
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Button */}
            {activeTab === 'unassigned' && selectedStudents.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
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
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}