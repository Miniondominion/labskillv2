import { useState, useEffect, useRef, useMemo } from 'react';
import { Users, ChevronDown, ChevronUp, Search, School } from 'lucide-react';
import debounce from 'lodash/debounce';

type StudentProgressProps = {
  students: {
    id: string;
    name: string;
    class_id: string | null;
    skills: {
      id: string;
      name: string;
      completed: number;
      total: number;
    }[];
  }[];
  classes: {
    id: string;
    name: string;
  }[];
};

export function StudentProgress({ students, classes }: StudentProgressProps) {
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const classRef = useRef<HTMLDivElement>(null);

  // Create debounced search function
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setDebouncedSearchTerm(term);
    }, 300),
    []
  );

  // Update search term with debounce
  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  // Handle click outside for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (classRef.current && !classRef.current.contains(event.target as Node)) {
        setShowClassDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleStudent = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.min((completed / total) * 100, 100);
  };

  // Filter students based on search term and selected class
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesClass = selectedClass === 'all' || student.class_id === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, debouncedSearchTerm, selectedClass]);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Student Progress
            </h3>
          </div>
          <span className="text-sm text-gray-500">
            {filteredStudents.length} Student{filteredStudents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div ref={searchRef}>
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 py-3 sm:text-sm border-gray-300 rounded-lg transition-colors"
                placeholder="Search by name..."
              />
            </div>
          </div>

          {/* Class Filter */}
          <div ref={classRef}>
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
                      setSelectedClass('all');
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
                        setSelectedClass(cls.id);
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

        <div className="mt-5">
          {filteredStudents.length > 0 ? (
            <div className="space-y-4">
              {filteredStudents.map((student) => (
                <div key={student.id} className="border rounded-lg">
                  <button
                    onClick={() => toggleStudent(student.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <h4 className="text-lg font-medium text-gray-900">{student.name}</h4>
                      {student.class_id && (
                        <span className="text-sm text-gray-500 sm:ml-2">
                          ({classes.find(c => c.id === student.class_id)?.name})
                        </span>
                      )}
                    </div>
                    {expandedStudents.has(student.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedStudents.has(student.id) && (
                    <div className="border-t px-4 py-3">
                      {student.skills.length > 0 ? (
                        <div className="space-y-4">
                          {student.skills.map((skill) => (
                            <div key={skill.id} className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-900">{skill.name}</span>
                                <span className="text-gray-600 font-medium">
                                  {skill.completed} / {skill.total} submissions
                                </span>
                              </div>
                              <div className="relative pt-1">
                                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                                  <div
                                    style={{ width: `${calculateProgress(skill.completed, skill.total)}%` }}
                                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                                      skill.completed >= skill.total
                                        ? 'bg-green-500'
                                        : skill.completed > 0
                                        ? 'bg-blue-500'
                                        : 'bg-gray-300'
                                    }`}
                                  />
                                </div>
                                <div className="flex justify-end mt-1">
                                  <span className="text-xs font-semibold inline-block text-gray-600">
                                    {Math.round(calculateProgress(skill.completed, skill.total))}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No skills assigned</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedClass !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No students assigned'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}