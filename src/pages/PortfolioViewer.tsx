import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Briefcase, ArrowLeft, Loader2, FileText, Calendar, Link as LinkIcon, Download, Share2, Eye, EyeOff, Lock } from 'lucide-react';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { StatusMessage } from '../components/shared/StatusMessage';
import { Badge } from '../components/shared/Badge';
import { getPortfolioData } from '../lib/portfolio';

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

type Section = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_required: boolean;
  fields: Field[];
};

type Field = {
  id: string;
  name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: any;
  validation_rules: any;
  order_index: number;
  value?: any;
};

export function PortfolioViewer() {
  const { user } = useAuth();
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<PortfolioInstance | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isOwner, setIsOwner] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [showPrivateData, setShowPrivateData] = useState(false);

  useEffect(() => {
    if (instanceId) {
      loadPortfolio();
    }
  }, [instanceId, user]);

  async function loadPortfolio() {
    try {
      setLoading(true);
      setError(null);

      // First check if user is authorized to view this portfolio
      if (!user) {
        throw new Error('You must be logged in to view portfolios');
      }

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';
      setIsInstructor(profile?.role === 'instructor');

      // Load portfolio instance
      const { data: instanceData, error: instanceError } = await supabase
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
        `)
        .eq('id', instanceId)
        .single();

      if (instanceError) throw instanceError;
      setInstance(instanceData);
      
      // Check if user is the owner of this portfolio
      const isPortfolioOwner = instanceData.student_id === user.id;
      setIsOwner(isPortfolioOwner);
      
      // Check if user is authorized to view this portfolio
      if (!isAdmin && !isPortfolioOwner && !isInstructor) {
        throw new Error('You are not authorized to view this portfolio');
      }

      // Load sections with fields
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('portfolio_sections')
        .select(`
          *,
          fields:portfolio_fields (
            id,
            name,
            label,
            field_type,
            is_required,
            options,
            validation_rules,
            order_index
          )
        `)
        .eq('template_id', instanceData.template_id)
        .order('order_index');

      if (sectionsError) throw sectionsError;

      // Load portfolio data
      const { data: portfolioData, error: portfolioDataError } = await supabase
        .from('portfolio_data')
        .select('field_id, value')
        .eq('instance_id', instanceId);

      if (portfolioDataError) throw portfolioDataError;

      // Map portfolio data to fields
      const dataMap = new Map(portfolioData?.map(item => [item.field_id, item.value]) || []);
      
      // Process sections and fields
      const processedSections = sectionsData?.map(section => {
        const fields = (section.fields || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(field => ({
            ...field,
            value: dataMap.get(field.id) || null
          }));
        
        return {
          ...section,
          fields
        };
      }) || [];

      setSections(processedSections);
      
      // Expand all sections by default
      setExpandedSections(new Set(processedSections.map(s => s.id)));
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const renderFieldValue = (field: Field) => {
    if (!field.value) {
      return <span className="text-gray-400 italic">Not provided</span>;
    }

    switch (field.field_type) {
      case 'text':
      case 'number':
      case 'date':
        return <span>{field.value}</span>;
      
      case 'longtext':
        return <p className="whitespace-pre-wrap">{field.value}</p>;
      
      case 'select':
        return <span>{field.value}</span>;
      
      case 'multiselect':
        return (
          <div className="flex flex-wrap gap-1">
            {Array.isArray(field.value) && field.value.map((item, i) => (
              <Badge key={i} variant="blue" size="sm">{item}</Badge>
            ))}
          </div>
        );
      
      case 'link':
        return (
          <a 
            href={field.value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            {field.value}
          </a>
        );
      
      case 'image':
        return (
          <div className="mt-1">
            <img 
              src={field.value} 
              alt={field.label} 
              className="max-w-full h-auto max-h-64 rounded-lg"
            />
          </div>
        );
      
      case 'file':
        return (
          <a 
            href={field.value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Download File
          </a>
        );
      
      case 'skill_list':
        return (
          <div className="space-y-1">
            {Array.isArray(field.value) && field.value.map((skill, i) => (
              <div key={i} className="flex items-center">
                <span className="w-4 h-4 bg-green-500 rounded-full mr-2"></span>
                <span>{skill.name}</span>
              </div>
            ))}
          </div>
        );
      
      case 'clinical_list':
        return (
          <div className="space-y-1">
            {Array.isArray(field.value) && field.value.map((entry, i) => (
              <div key={i} className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        );
      
      case 'dynamic':
        return <span className="font-semibold">{field.value}</span>;
      
      default:
        return <span>{JSON.stringify(field.value)}</span>;
    }
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

  if (error) {
    return (
      <DashboardLayout>
        <StatusMessage type="error" message={error} />
      </DashboardLayout>
    );
  }

  if (!instance) {
    return (
      <DashboardLayout>
        <StatusMessage type="error" message="Portfolio not found" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                icon={<ArrowLeft className="h-4 w-4" />}
                className="mr-4"
              >
                Back
              </Button>
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">{instance.template.name}</h1>
                  <Badge 
                    variant={instance.status === 'published' ? 'green' : 'yellow'} 
                    className="ml-3"
                  >
                    {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {instance.student.full_name} • {instance.student.email}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {isOwner && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/portfolio/edit/${instanceId}`)}
                icon={<FileText className="h-4 w-4" />}
              >
                Edit Portfolio
              </Button>
            )}
            {(isOwner || isInstructor) && (
              <Button
                variant="secondary"
                onClick={() => setShowPrivateData(!showPrivateData)}
                icon={showPrivateData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              >
                {showPrivateData ? 'Hide Private Data' : 'Show Private Data'}
              </Button>
            )}
            <Button
              onClick={() => {/* Share functionality */}}
              icon={<Share2 className="h-4 w-4" />}
            >
              Share
            </Button>
          </div>
        </div>

        {/* Portfolio Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.id}>
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection(section.id)}
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{section.name}</h3>
                  {section.description && (
                    <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                  )}
                </div>
                <div>
                  {expandedSections.has(section.id) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedSections.has(section.id) && (
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    {section.fields.map((field) => {
                      const isPrivate = field.options?.isPrivate;
                      if (isPrivate && !showPrivateData && !isOwner && !isInstructor) {
                        return (
                          <div key={field.id} className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                              {field.label}
                              <Lock className="h-4 w-4 ml-1 text-gray-400" />
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 flex items-center">
                              <span className="text-gray-400 italic">Private information</span>
                            </dd>
                          </div>
                        );
                      }

                      return (
                        <div key={field.id} className={field.field_type === 'longtext' ? 'sm:col-span-2' : ''}>
                          <dt className="text-sm font-medium text-gray-500 flex items-center">
                            {field.label}
                            {isPrivate && <Lock className="h-4 w-4 ml-1 text-gray-400" />}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {renderFieldValue(field)}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}