import { Student, Class } from '../../../types/skills';
import { CheckSquare, Square, Download, Loader2, Trash2, Search, School, ChevronDown, ChevronUp } from 'lucide-react';
import { useRef, useEffect } from 'react';

type Props = {
  students: Student[];
  classes: Class[];
  selectedStudents: string[];
  studentAssignments: {
    [studentId: string]: {
      requiredSubmissions: number;
      dueDate: string;
    };
  };
  showCheckboxes: boolean;
  onSelectStudent: (studentId: string, selected: boolean) => void;
  onSelectAll?: () => void;
  onUnassignStudent?: (studentId: string) => Promise<void>;
  onExport?: () => void;
  setStudentAssignments: (assignments: {[key: string]: { requiredSubmissions: number; dueDate: string }}) => void;
  submitting?: boolean;
  unassigning?: string | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedClass: string;
  onClassChange: (classId: string) => void;
  showClassDropdown: boolean;
  setShowClassDropdown: (show: boolean) => void;
};

export function StudentTable({
  students,
  classes,
  selectedStudents,
  studentAssignments,
  showCheckboxes,
  onSelectStudent,
  onSelectAll,
  onUnassignStudent,
  onExport,
  setStudentAssignments,
  submitting,
  unassigning,
  searchTerm,
  onSearchChange,
  selectedClass,
  onClassChange,
  showClassDropdown,
  setShowClassDropdown
}: Props) {
  const classDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
        setShowClassDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowClassDropdown]);

  function formatStatus(status: string): string {
    switch (status) {
      case 'pending':
        return 'Incomplete';
      case 'completed':
        return 'Completed';
      case 'expired':
        return 'Expired';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4 space-x-3">
        {showCheckboxes && onSelectAll && (
          <button
            onClick={onSelectAll}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {selectedStudents.length === students.length ? (
              <Square className="h-4 w-4 mr-2" />
            ) : (
              <CheckSquare className="h-4 w-4 mr-2" />
            )}
            Select All
          </button>
        )}
        {!showCheckboxes && onExport && (
          <button
            onClick={onExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search Students
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 py-3 sm:text-sm border-gray-300 rounded-lg transition-colors"
                placeholder="Search by name..."
              />
            </div>
          </div>

          {/* Class Filter */}
          <div ref={classDropdownRef}>
            <label htmlFor="class-filter" className="block text-sm font-medium text-gray-700">
              Filter by Class
            </label>
            <div className="mt-1 relative">
              <button
                type="button"
                onClick={() => setShowClassDropdown(!showClassDropdown)}
                className="relative w-full bg-white border border-gray-300 rounded-lg py-3 pl-10 pr-10 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors hover:bg-gray-50"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <School className="h-5 w-5 text-gray-400" />
                </div>
                <span className="block truncate">
                  {selectedClass === 'all' 
                    ? 'All Classes' 
                    : classes.find(c => c.id === selectedClass)?.name || 'All Classes'}
                </span>
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {showClassDropdown ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </span>
              </button>

              {showClassDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  <div
                    onClick={() => {
                      onClassChange('all');
                      setShowClassDropdown(false);
                    }}
                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 ${
                      selectedClass === 'all' ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
                    }`}
                  >
                    All Classes
                  </div>
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => {
                        onClassChange(cls.id);
                        setShowClassDropdown(false);
                      }}
                      className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 ${
                        selectedClass === cls.id ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
                      }`}
                    >
                      {cls.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showCheckboxes && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={selectedStudents.length === students.length}
                    onChange={onSelectAll}
                  />
                </th>
              )}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Required Submissions
              </th>
              {!showCheckboxes && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
              )}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              {!showCheckboxes && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id}>
                {showCheckboxes && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={(e) => onSelectStudent(student.id, e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{student.full_name}</div>
                  <div className="text-sm text-gray-500">{student.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {classes.find(c => c.id === student.class_id)?.name || 'No Class'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {student.assignment ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.assignment.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : student.assignment.status === 'expired'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {formatStatus(student.assignment.status)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Not Assigned
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {showCheckboxes ? (
                    <input
                      type="number"
                      min="1"
                      value={studentAssignments[student.id]?.requiredSubmissions || 1}
                      onChange={(e) => {
                        const value = Math.max(1, parseInt(e.target.value) || 1);
                        setStudentAssignments({
                          ...studentAssignments,
                          [student.id]: {
                            ...studentAssignments[student.id],
                            requiredSubmissions: value
                          }
                        });
                      }}
                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  ) : (
                    <span className="text-sm text-gray-900">
                      {student.assignment?.required_submissions || 1}
                    </span>
                  )}
                </td>
                {!showCheckboxes && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{
                            width: student.assignment 
                              ? `${(student.assignment.completed_submissions / student.assignment.required_submissions) * 100}%`
                              : '0%'
                          }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        {student.assignment?.completed_submissions || 0}/{student.assignment?.required_submissions || 1}
                      </span>
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  {showCheckboxes ? (
                    <input
                      type="date"
                      value={studentAssignments[student.id]?.dueDate || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        setStudentAssignments({
                          ...studentAssignments,
                          [student.id]: {
                            ...studentAssignments[student.id],
                            dueDate: e.target.value
                          }
                        });
                      }}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">
                      {student.assignment?.due_date ? (
                        <span className={`${
                          new Date(student.assignment.due_date) < new Date() 
                            ? 'text-red-600' 
                            : 'text-gray-900'
                        }`}>
                          {new Date(student.assignment.due_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-500">No due date</span>
                      )}
                    </div>
                  )}
                </td>
                {!showCheckboxes && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {onUnassignStudent && student.assignment && (
                      <button
                        onClick={() => onUnassignStudent(student.id)}
                        disabled={unassigning === student.id}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        {unassigning === student.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}