import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Briefcase, Plus, Search, Eye, FileText, Calendar, Loader2 } from 'lucide-react';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { StatusMessage } from '../components/shared/StatusMessage';
import { Badge } from '../components/shared/Badge';
import { EmptyState } from '../components/shared/EmptyState';

type PortfolioInstance = {
  id: string;
  template_id: string;
  student_id: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  published_at: string | null;
  student: {
    full_name: string;
    email: string;
  };
  template: {
    name: string;
    description: string | null;
  };
};

export function PortfolioList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioInstance[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadUserRole();
      loadPortfolios();
    }
  }, [user]);

  async function loadUserRole() {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      setUserRole(profile?.role || null);

      // If instructor or admin, load students
      if (profile?.role === 'instructor' || profile?.role === 'admin') {
        loadStudents();
      }
    } catch (err) {
      console.error('Error loading user role:', err);
    }
  }

  async function loadStudents() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  }

  async function loadPortfolios() {
    try {
      setLoading(true);
      setError(null);

      // First get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      const isAdmin = profile?.role === 'admin';
      const isInstructor = profile?.role === 'instructor';

      // Load available templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('portfolio_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Load portfolios based on role
      let query = supabase
        .from('portfolio_instances')
        .select(`
          *,
          student:profiles!portfolio_instances_student_id_fkey (
            full_name,
            email
          ),
          template:portfolio_templates (
            name,
            description
          )
        `);

      if (isAdmin) {
        // Admin can see all portfolios
      } else if (isInstructor) {
        // Instructor can see portfolios of affiliated students
        query = query.in(
          'student_id', 
          supabase
            .from('profiles')
            .select('id')
            .eq('affiliated_instructor', user?.id)
        );
      } else {
        // Students can only see their own portfolios
        query = query.eq('student_id', user?.id);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      setPortfolios(data || []);
    } catch (err) {
      console.error('Error loading portfolios:', err);
      setError('Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePortfolio(templateId: string, studentId?: string) {
    try {
      setError(null);
      
      // Create new portfolio instance
      const { data, error } = await supabase
        .from('portfolio_instances')
        .insert([{
          template_id: templateId,
          student_id: studentId || user?.id,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) throw error;

      // Redirect to edit page
      navigate(`/portfolio/edit/${data.id}`);
    } catch (err) {
      console.error('Error creating portfolio:', err);
      setError('Failed to create portfolio');
    }
  }

  const filteredPortfolios = portfolios.filter(portfolio => {
    const searchLower = searchTerm.toLowerCase();
    return (
      portfolio.template.name.toLowerCase().includes(searchLower) ||
      portfolio.student.full_name.toLowerCase().includes(searchLower) ||
      portfolio.student.email.toLowerCase().includes(searchLower)
    );
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
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolios</h1>
            <p className="mt-1 text-sm text-gray-500">
              {userRole === 'student' 
                ? 'Manage and share your professional portfolio' 
                : 'View and manage student portfolios'}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            {userRole === 'student' && templates.length > 0 && (
              <div className="relative inline-block text-left">
                <Button
                  onClick={() => handleCreatePortfolio(templates[0].id)}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Create Portfolio
                </Button>
              </div>
            )}
            {(userRole === 'instructor' || userRole === 'admin') && (
              <Button
                onClick={() => navigate('/admin/portfolio-builder')}
                icon={<Briefcase className="h-4 w-4" />}
              >
                Manage Templates
              </Button>
            )}
          </div>
        </div>

        {error && <StatusMessage type="error" message={error} />}

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search portfolios..."
          />
        </div>

        {/* Portfolios List */}
        {filteredPortfolios.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPortfolios.map((portfolio) => (
              <Card 
                key={portfolio.id}
                onClick={() => navigate(`/portfolio/view/${portfolio.id}`)}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{portfolio.template.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{portfolio.student.full_name}</p>
                    </div>
                    <Badge 
                      variant={
                        portfolio.status === 'published' ? 'green' : 
                        portfolio.status === 'archived' ? 'gray' : 'yellow'
                      }
                    >
                      {portfolio.status.charAt(0).toUpperCase() + portfolio.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {portfolio.status === 'published' && portfolio.published_at
                      ? `Published on ${new Date(portfolio.published_at).toLocaleDateString()}`
                      : `Updated on ${new Date(portfolio.updated_at).toLocaleDateString()}`
                    }
                  </div>
                  
                  <div className="mt-4 flex space-x-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye className="h-4 w-4" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/portfolio/view/${portfolio.id}`);
                      }}
                    >
                      View
                    </Button>
                    {(userRole === 'student' && portfolio.student_id === user?.id) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FileText className="h-4 w-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/portfolio/edit/${portfolio.id}`);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Briefcase}
            title="No portfolios found"
            description={
              userRole === 'student'
                ? "Create your first portfolio to showcase your skills and experience"
                : "No student portfolios match your search criteria"
            }
            action={
              userRole === 'student' && templates.length > 0
                ? {
                    label: "Create Portfolio",
                    onClick: () => handleCreatePortfolio(templates[0].id),
                    icon: Plus
                  }
                : undefined
            }
          />
        )}
      </div>
    </DashboardLayout>
  );
}