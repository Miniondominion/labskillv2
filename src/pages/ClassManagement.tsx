import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Trash2, AlertCircle, Archive, X, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

type Class = {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  created_at: string;
  archived: boolean;
  student_count: number;
};

type Student = {
  id: string;
  full_name: string;
  email: string;
};

export function ClassManagement() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [archivedClasses, setArchivedClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showEnrollStudents, setShowEnrollStudents] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const sixMonthsFromNow = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    start_date: today,
    end_date: sixMonthsFromNow
  });

  useEffect(() => {
    loadClasses();
  }, [user]);

  async function loadClasses() {
    try {
      if (!user) return;

      // Load active classes
      const { data: activeData, error: activeError } = await supabase
        .from('classes')
        .select('*')
        .eq('instructor_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;

      // Load archived classes
      const { data: archivedData, error: archivedError } = await supabase
        .from('classes')
        .select('*')
        .eq('instructor_id', user.id)
        .eq('archived', true)
        .order('created_at', { ascending: false });

      if (archivedError) throw archivedError;

      // Get student counts for all classes
      const allClasses = [...(activeData || []), ...(archivedData || [])];
      const classesWithCounts = await Promise.all(
        allClasses.map(async (cls) => {
          const { count } = await supabase
            .from('class_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);

          return {
            ...cls,
            student_count: count || 0
          };
        })
      );

      setClasses(classesWithCounts.filter(cls => !cls.archived));
      setArchivedClasses(classesWithCounts.filter(cls => cls.archived));
    } catch (err) {
      console.error('Error loading classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      
      if (new Date(newClass.end_date) < new Date(newClass.start_date)) {
        setError('End date must be after start date');
        return;
      }

      const { error } = await supabase
        .from('classes')
        .insert([{
          ...newClass,
          instructor_id: user?.id,
          archived: false
        }]);

      if (error) throw error;

      setSuccess('Class added successfully');
      setShowAddClass(false);
      setNewClass({
        name: '',
        description: '',
        start_date: today,
        end_date: sixMonthsFromNow
      });
      await loadClasses();
    } catch (err) {
      console.error('Error adding class:', err);
      setError('Failed to add class');
    }
  }

  async function handleArchiveClass(classId: string) {
    if (!window.confirm('Are you sure you want to archive this class? Students will no longer be able to access it.')) {
      return;
    }

    try {
      setArchiving(classId);
      setError(null);
      
      const { error } = await supabase
        .from('classes')
        .update({ archived: true })
        .eq('id', classId);

      if (error) throw error;

      // Move class from active to archived list
      const classToArchive = classes.find(c => c.id === classId);
      if (classToArchive) {
        setClasses(classes.filter(c => c.id !== classId));
        setArchivedClasses([classToArchive, ...archivedClasses]);
      }

      setSuccess('Class archived successfully');
    } catch (err) {
      console.error('Error archiving class:', err);
      setError('Failed to archive class');
    } finally {
      setArchiving(null);
    }
  }

  async function handleRestoreClass(classId: string) {
    try {
      setRestoring(classId);
      setError(null);
      
      const { error } = await supabase
        .from('classes')
        .update({ archived: false })
        .eq('id', classId);

      if (error) throw error;

      // Move class from archived to active list
      const classToRestore = archivedClasses.find(c => c.id === classId);
      if (classToRestore) {
        setArchivedClasses(archivedClasses.filter(c => c.id !== classId));
        setClasses([classToRestore, ...classes]);
      }

      setSuccess('Class restored successfully');
    } catch (err) {
      console.error('Error restoring class:', err);
      setError('Failed to restore class');
    } finally {
      setRestoring(null);
    }
  }

  async function loadStudents(classId: string) {
    try {
      const { data: allStudents, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .eq('affiliated_instructor', user?.id);

      if (studentsError) throw studentsError;

      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId);

      if (enrollmentsError) throw enrollmentsError;

      const enrolledIds = new Set((enrollments || []).map(e => e.student_id));

      const enrolled = [];
      const available = [];
      
      for (const student of allStudents || []) {
        if (enrolledIds.has(student.id)) {
          enrolled.push(student);
        } else {
          available.push(student);
        }
      }

      setEnrolledStudents(enrolled);
      setAvailableStudents(available);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students');
    }
  }

  async function handleEnrollStudent(classId: string, studentId: string) {
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .insert([{
          class_id: classId,
          student_id: studentId
        }]);

      if (error) throw error;

      // Update enrolled/available students lists
      await loadStudents(classId);

      // Update the class's student count in both the classes list and selected class
      const updatedClasses = classes.map(cls => 
        cls.id === classId 
          ? { ...cls, student_count: cls.student_count + 1 }
          : cls
      );
      setClasses(updatedClasses);
      
      if (selectedClass && selectedClass.id === classId) {
        setSelectedClass({
          ...selectedClass,
          student_count: selectedClass.student_count + 1
        });
      }

      setSuccess('Student enrolled successfully');
    } catch (err) {
      console.error('Error enrolling student:', err);
      setError('Failed to enroll student');
    }
  }

  async function handleUnenrollStudent(classId: string, studentId: string) {
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId);

      if (error) throw error;

      // Update enrolled/available students lists
      await loadStudents(classId);

      // Update the class's student count in both the classes list and selected class
      const updatedClasses = classes.map(cls => 
        cls.id === classId 
          ? { ...cls, student_count: Math.max(0, cls.student_count - 1) }
          : cls
      );
      setClasses(updatedClasses);
      
      if (selectedClass && selectedClass.id === classId) {
        setSelectedClass({
          ...selectedClass,
          student_count: Math.max(0, selectedClass.student_count - 1)
        });
      }

      setSuccess('Student unenrolled successfully');
    } catch (err) {
      console.error('Error unenrolling student:', err);
      setError('Failed to unenroll student');
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col space-y-6 overflow-hidden">
        {/* Header */}
        <div className="flex-none">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your classes and student enrollments
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowAddClass(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Users className="h-4 w-4 mr-2" />
                Add Class
              </button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex-none bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="flex-none bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 min-h-0 overflow-auto">
          {/* Active Classes */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Active Classes</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {classes.map((cls) => (
                <li key={cls.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{cls.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{cls.description}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {cls.student_count} students
                        </div>
                        <div>
                          {new Date(cls.start_date).toLocaleDateString()} - {new Date(cls.end_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setSelectedClass(cls);
                          setShowEnrollStudents(true);
                          loadStudents(cls.id);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Students
                      </button>
                      <button
                        onClick={() => handleArchiveClass(cls.id)}
                        disabled={archiving === cls.id}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {archiving === cls.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                        ) : (
                          <Archive className="h-4 w-4 mr-2" />
                        )}
                        Archive
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {classes.length === 0 && (
                <li className="p-4 text-center">
                  <p className="text-sm text-gray-500">No active classes</p>
                </li>
              )}
            </ul>
          </div>

          {/* Archived Classes */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div
              className="px-4 py-5 sm:px-6 flex justify-between items-center cursor-pointer"
              onClick={() => setShowArchived(!showArchived)}
            >
              <h3 className="text-lg leading-6 font-medium text-gray-900">Archived Classes</h3>
              <button className="text-gray-400 hover:text-gray-500">
                {showArchived ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
            
            {showArchived && (
              <ul className="divide-y divide-gray-200">
                {archivedClasses.map((cls) => (
                  <li key={cls.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{cls.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{cls.description}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {cls.student_count} students
                          </div>
                          <div>
                            {new Date(cls.start_date).toLocaleDateString()} - {new Date(cls.end_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreClass(cls.id)}
                        disabled={restoring === cls.id}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {restoring === cls.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Restore
                      </button>
                    </div>
                  </li>
                ))}
                {archivedClasses.length === 0 && (
                  <li className="p-4 text-center">
                    <p className="text-sm text-gray-500">No archived classes</p>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Add Class Modal */}
        {showAddClass && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Class</h3>
                <button
                  onClick={() => setShowAddClass(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleAddClass} className="space-y-4">
                <div>
                  <label htmlFor="className" className="block text-sm font-medium text-gray-700">
                    Class Name
                  </label>
                  <input
                    type="text"
                    id="className"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="classDescription" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="classDescription"
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={newClass.start_date}
                      onChange={(e) => setNewClass({ ...newClass, start_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={newClass.end_date}
                      min={newClass.start_date}
                      onChange={(e) => setNewClass({ ...newClass, end_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddClass(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enroll Students Modal */}
        {showEnrollStudents && selectedClass && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-none">
                <h3 className="text-lg font-medium text-gray-900">
                  Manage Students - {selectedClass.name}
                </h3>
                <button
                  onClick={() => {
                    setShowEnrollStudents(false);
                    setSelectedClass(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="grid grid-cols-2 gap-6 h-full">
                  {/* Available Students */}
                  <div className="flex flex-col min-h-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex-none">Available Students</h4>
                    <div className="flex-1 border rounded-lg overflow-auto">
                      {availableStudents.map((student) => (
                        <div key={student.id} className="p-3 flex justify-between items-center border-b last:border-b-0">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                          <button
                            onClick={() => handleEnrollStudent(selectedClass.id, student.id)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Enroll
                          </button>
                        </div>
                      ))}
                      {availableStudents.length === 0 && (
                        <p className="p-3 text-sm text-gray-500">No available students</p>
                      )}
                    </div>
                  </div>

                  {/* Enrolled Students */}
                  <div className="flex flex-col min-h-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex-none">Enrolled Students</h4>
                    <div className="flex-1 border rounded-lg overflow-auto">
                      {enrolledStudents.map((student) => (
                        <div key={student.id} className="p-3 flex justify-between items-center border-b last:border-b-0">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                          <button
                            onClick={() => handleUnenrollStudent(selectedClass.id, student.id)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {enrolledStudents.length === 0 && (
                        <p className="p-3 text-sm text-gray-500">No enrolled students</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}