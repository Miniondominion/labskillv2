import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, FileText, BookOpen, GraduationCap, Mail, ClipboardList, Briefcase } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StudentProgress } from './dashboard/StudentProgress';
import { chunkArray, retryOperation } from '../lib/utils';

type DashboardStats = {
  totalStudents: number;
  totalReports: number;
  totalSkills: number;
  totalClasses: number;
  pendingRequests: number;
  clinicalEntries: number;
  pendingReviews: number;
  portfolioCount: number;
};

type Student = {
  id: string;
  name: string;
  class_id: string | null;
  skills: {
    id: string;
    name: string;
    completed: number;
    total: number;
  }[];
};

type Class = {
  id: string;
  name: string;
};

export function InstructorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalReports: 0,
    totalSkills: 0,
    totalClasses: 0,
    pendingRequests: 0,
    clinicalEntries: 0,
    pendingReviews: 0,
    portfolioCount: 0
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user]); 

  async function loadDashboardData() {
    try {
      if (!user) return;

      // Get total students affiliated with this instructor
      const { count: studentsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('affiliated_instructor', user.id)
        .eq('role', 'student');

      // Get total skill logs (reports)
      const { count: reportsCount } = await supabase
        .from('skill_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted')
        .eq('student_id', user.id);

      // Get total custom skills (excluding templates)
      const { count: skillsCount } = await supabase
        .from('skills')
        .select('*', { count: 'exact', head: true })
        .eq('is_template', false);

      // Get total active classes
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('instructor_id', user.id)
        .eq('archived', false);

      // Get count of pending affiliation requests
      const { count: pendingRequestsCount } = await supabase
        .from('affiliation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('instructor_id', user.id)
        .eq('status', 'pending');

      // Get portfolio count
      const { count: portfolioCount } = await supabase
        .from('portfolio_instances')
        .select('*', { count: 'exact', head: true })
        .in(
          'student_id',
          supabase
            .from('profiles')
            .select('id')
            .eq('affiliated_instructor', user.id)
        );

      // Get affiliated students first
      const { data: affiliatedStudents } = await retryOperation(() =>
        supabase
          .from('profiles')
          .select('id')
          .eq('affiliated_instructor', user.id)
          .eq('role', 'student')
      );

      const studentIds = affiliatedStudents?.map(student => student.id) || [];
      let totalEntries = 0;
      let totalPendingReviews = 0;

      // Process student IDs in chunks of 10 to avoid URL length limits
      const chunks = chunkArray(studentIds, 10);
      for (const chunk of chunks) {
        // Get count of clinical entries for this chunk
        const { count: entriesCount } = await supabase
          .from('clinical_entries')
          .select('*', { count: 'exact', head: true })
          .in('student_id', chunk);

        totalEntries += entriesCount || 0;
      }

      // Get students with their skill assignments and logs
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          class_enrollments (
            class_id
          ),
          skill_assignments!skill_assignments_student_id_fkey (
            id,
            skill_id,
            required_submissions,
            skills (
              id,
              name
            )
          ),
          skill_logs!skill_logs_student_id_fkey (
            id,
            skill_id,
            status
          )
        `)
        .eq('affiliated_instructor', user.id)
        .eq('role', 'student');

      if (studentsError) throw studentsError;

      // Get all classes for filtering
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('instructor_id', user.id)
        .eq('archived', false)
        .order('name');

      if (classesError) throw classesError;

      // Process student progress data
      const progress = (studentsData || []).map(student => {
        // Group assignments by skill
        const skillMap = new Map();
        
        student.skill_assignments?.forEach(assignment => {
          if (!assignment.skills) return;
          
          // Count submitted logs for this skill
          const submissions = student.skill_logs?.filter(log => 
            log.skill_id === assignment.skill_id && log.status === 'submitted'
          ).length || 0;
          
          skillMap.set(assignment.skills.id, {
            id: assignment.skills.id,
            name: assignment.skills.name,
            completed: submissions,
            total: assignment.required_submissions
          });
        });

        return {
          id: student.id,
          name: student.full_name,
          class_id: student.class_enrollments?.[0]?.class_id || null,
          skills: Array.from(skillMap.values())
        };
      });

      setStats({
        totalStudents: studentsCount || 0,
        totalReports: reportsCount || 0,
        totalSkills: skillsCount || 0,
        totalClasses: classesCount || 0,
        pendingRequests: pendingRequestsCount || 0,
        clinicalEntries: totalEntries,
        pendingReviews: totalPendingReviews,
        portfolioCount: portfolioCount || 0
      });

      setStudents(progress);
      setClasses(classesData || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div 
          onClick={() => navigate('/instructor/students')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow relative"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Students
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalStudents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          {stats.pendingRequests > 0 && (
            <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3">
              <span className="flex h-6 w-6 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 text-white text-xs items-center justify-center">
                  {stats.pendingRequests}
                </span>
              </span>
            </div>
          )}
        </div>

        <div 
          onClick={() => navigate('/instructor/reports')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Reports
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalReports}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/skills')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Skills Management
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalSkills}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/portfolio')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Briefcase className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Student Portfolios
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.portfolioCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Progress */}
      <StudentProgress students={students} classes={classes} />
    </div>
  );
}