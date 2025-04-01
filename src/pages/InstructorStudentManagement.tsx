import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Loader2, Users, School, Mail, Search, RefreshCw, UserMinus, CheckCircle, XCircle } from 'lucide-react';

type Student = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  class_enrollments: {
    class_id: string;
    class: {
      id: string;
      name: string;
    } | null;
  }[];
};

type AffiliationRequest = {
  id: string;
  student_id: string;
  created_at: string;
  student: {
    full_name: string;
    email: string;
  };
};

export function InstructorStudentManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [affiliationRequests, setAffiliationRequests] = useState<AffiliationRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [removingAffiliation, setRemovingAffiliation] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    try {
      if (!user) return;
      setRefreshing(true);
      setError(null);

      // Load affiliated students
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          created_at,
          class_enrollments (
            class_id,
            class:classes (
              id,
              name
            )
          )
        `)
        .eq('role', 'student')
        .eq('affiliated_instructor', user.id)
        .order('full_name');

      if (studentsError) throw studentsError;

      // Load pending affiliation requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('affiliation_requests')
        .select(`
          id,
          student_id,
          created_at,
          student:profiles!affiliation_requests_student_id_fkey (
            full_name,
            email
          )
        `)
        .eq('instructor_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setStudents(studentsData || []);
      setAffiliationRequests(requestsData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleAffiliationRequest(requestId: string, approve: boolean) {
    try {
      setProcessingRequest(requestId);
      setError(null);
      setSuccess(null);

      // Update request status
      const { error: statusError } = await supabase
        .from('affiliation_requests')
        .update({ status: approve ? 'approved' : 'rejected' })
        .eq('id', requestId);

      if (statusError) throw statusError;

      setSuccess(`Affiliation request ${approve ? 'approved' : 'rejected'} successfully`);
      await loadData();
    } catch (err) {
      console.error('Error processing affiliation request:', err);
      setError('Failed to process affiliation request');
    } finally {
      setProcessingRequest(null);
    }
  }

  async function handleRemoveAffiliation(studentId: string) {
    if (!window.confirm('Are you sure you want to remove this student? This will remove them from all your classes and your instructor affiliation.')) {
      return;
    }

    try {
      setRemovingAffiliation(studentId);
      setError(null);
      setSuccess(null);

      // Call the remove_student_instructor_affiliation function
      const { error: removalError } = await supabase
        .rpc('remove_student_instructor_affiliation', {
          p_student_id: studentId,
          p_instructor_id: user?.id
        });

      if (removalError) throw removalError;

      // Get instructor's class IDs
      const { data: classIds } = await supabase
        .from('classes')
        .select('id')
        .eq('instructor_id', user?.id);

      // Remove from all instructor's classes
      if (classIds && classIds.length > 0) {
        const { error: enrollmentError } = await supabase
          .from('class_enrollments')
          .delete()
          .eq('student_id', studentId)
          .in('class_id', classIds.map(c => c.id));

        if (enrollmentError) throw enrollmentError;
      }

      setSuccess('Student affiliation removed successfully');
      await loadData();
    } catch (err) {
      console.error('Error removing student affiliation:', err);
      setError('Failed to remove student affiliation');
    } finally {
      setRemovingAffiliation(null);
    }
  }

  // Filter students based on search term
  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage your affiliated students
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

        {/* Pending Affiliation Requests */}
        {affiliationRequests.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-yellow-600" />
                  <h3 className="ml-2 text-lg font-medium text-gray-900">
                    Pending Affiliation Requests
                  </h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {affiliationRequests.length} Pending
                </span>
              </div>

              <div className="space-y-4">
                {affiliationRequests.map((request) => (
                  <div 
                    key={request.id}
                    className="bg-yellow-50 rounded-lg p-4 border border-yellow-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {request.student.full_name}
                        </h4>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Mail className="h-4 w-4 mr-1" />
                          {request.student.email}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Requested: {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleAffiliationRequest(request.id, true)}
                          disabled={processingRequest === request.id}
                          className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {processingRequest === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleAffiliationRequest(request.id, false)}
                          disabled={processingRequest === request.id}
                          className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          {processingRequest === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white shadow rounded-lg p-4">
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
        </div>

        {/* Students List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-indigo-600" />
                <h3 className="ml-2 text-lg font-medium text-gray-900">
                  Affiliated Students
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
                        Affiliated since {new Date(student.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAffiliation(student.id)}
                      disabled={removingAffiliation === student.id}
                      className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {removingAffiliation === student.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Class Enrollment */}
                  <div className="border-t border-gray-200 pt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <School className="h-4 w-4 mr-1" />
                      Class Enrollment
                    </h5>
                    {student.class_enrollments && student.class_enrollments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {student.class_enrollments.map((enrollment, index) => (
                          enrollment.class && (
                            <div 
                              key={index}
                              className="bg-white rounded-md p-3 border border-gray-200"
                            >
                              <div className="text-sm font-medium text-gray-900">
                                {enrollment.class.name}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Not enrolled in any classes</p>
                    )}
                  </div>
                </div>
              ))}

              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search criteria' : 'You have no affiliated students'}
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