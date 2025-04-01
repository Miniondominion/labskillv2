import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Star, LineChart as ChartLine, ClipboardList, BookOpen, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SkillProgress } from './skills/SkillProgress';
import { useNavigate } from 'react-router-dom';

type SkillSummary = {
  total: number;
};

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [skillSummary, setSkillSummary] = useState<SkillSummary>({
    total: 0
  });
  const [portfolioCount, setPortfolioCount] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    try {
      if (!user) return;

      // Get assignments to count total unique skills
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('skill_assignments')
        .select('skill_id')
        .eq('student_id', user.id);

      if (assignmentsError) throw assignmentsError;

      // Count unique skills
      const uniqueSkills = new Set(assignmentsData?.map(a => a.skill_id) || []);

      setSkillSummary({
        total: uniqueSkills.size
      });

      // Get portfolio count
      const { count: portfolioCount, error: portfolioError } = await supabase
        .from('portfolio_instances')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id);

      if (portfolioError) throw portfolioError;
      setPortfolioCount(portfolioCount || 0);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Achievement Tracking
                  </dt>
                  <dd className="text-sm text-gray-500">
                    Coming soon
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartLine className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Progress Analytics
                  </dt>
                  <dd className="text-sm text-gray-500">
                    Coming soon
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/clinical-documentation')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardList className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Clinical Documentation
                  </dt>
                  <dd className="text-sm text-gray-500">
                    Document clinical skills
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/portfolio')}
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Briefcase className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Portfolio
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {portfolioCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Progress */}
      <SkillProgress />
    </div>
  );
}