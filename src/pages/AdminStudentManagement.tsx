import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Loader2, Users, School, Mail, Search, Filter, RefreshCw } from 'lucide-react';

type Student = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  affiliated_instructor: string | null;
  class_enrollments: {
    class: {
      id: string;
      name: string;
      instructor: {
        full_name: string;
      };
    };
  }[];
};

type Instructor = {
  id: string;
  full_name: string;
};

export function AdminStudentManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    try {
      setRefreshing(true);
      setError(null);

      // First load instructors (profiles with role='instructor')
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'instructor')
        .order('full_name');

      if (instructorsError) throw instructorsError;
      setInstructors(instructorsData || []);

      // Then load students with their affiliated instructor and class enrollments
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          created_at,
          affiliated_instructor,
          class_enrollments (
            class:classes (
              id,
              name,
              instructor:profiles (
                full_name
              )
            )
          )
        `)
        .eq('role', 'student')
        .order('full_name');

      if (studentsError) throw studentsError;

      // Map the instructor IDs to their full names
      const studentsWithInstructorNames = studentsData?.map(student => {
        const instructor = instructorsData?.find(i => i.id === student.affiliated_instructor);
        return {
          ...student,
          affiliated_instructor: instructor?.full_name || null
        };
      });

      setStudents(studentsWithInstructorNames || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load student data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Filter students based on search term and selected instructor
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesInstructor = 
      selectedInstructor === 'all' ||
      (selectedInstructor === 'none' && !student.affiliated_instructor) ||
      instructors.find(i => i.id === selectedInstructor)?.full_name === student.affiliated_instructor;

    return matchesSearch && matchesInstructor;
  });

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
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage all student accounts
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

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
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Search by name or email..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="instructor-filter" className="block text-sm font-medium text-gray-700">
                Filter by Instructor
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="instructor-filter"
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="all">All Instructors</option>
                  <option value="none">No Instructor</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-indigo-600" />
                <h3 className="ml-2 text-lg font-medium text-gray-900">
                  Students
                </h3>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {filteredStudents.length} Total
              </span>
            </div>

            <div className="space-y-6">
              {filteredStudents.map((student) => (
                <div 
                  key={student.id}
                  className="bg-gray-50 rounded-lg p-4 space-y-4"
                >
                  {/* Student Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {student.full_name}
                      </h4>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Mail className="h-4 w-4 mr-1" />
                        {student.email}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Joined {new Date(student.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {student.affiliated_instructor && (
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">Instructor</span>
                        <div className="mt-1 text-sm text-gray-500">
                          {student.affiliated_instructor}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enrolled Classes */}
                  {student.class_enrollments && student.class_enrollments.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <School className="h-4 w-4 mr-1" />
                        Enrolled Classes
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {student.class_enrollments.map((enrollment, index) => (
                          <div 
                            key={`${enrollment.class.id}-${index}`}
                            className="bg-white rounded-md p-3 border border-gray-200"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {enrollment.class.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Instructor: {enrollment.class.instructor.full_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}