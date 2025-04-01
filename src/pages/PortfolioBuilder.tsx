import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, FileText, Settings, AlertCircle, Loader2, X, Eye } from 'lucide-react';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { StatusMessage } from '../components/shared/StatusMessage';
import { Modal } from '../components/shared/Modal';
import { FormField } from '../components/shared/FormField';
import { PortfolioPreview } from '../components/portfolio/PortfolioPreview';

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export function PortfolioBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: ''
  });
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [publishedCount, setPublishedCount] = useState(0);

  useEffect(() => {
    checkUserRole();
    loadTemplates();
    getPublishedCount();
  }, [user]);

  async function checkUserRole() {
    try {
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    } catch (err) {
      console.error('Error checking user role:', err);
      setError('Failed to verify access permissions');
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('portfolio_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    }
  }

  async function getPublishedCount() {
    try {
      const { count, error } = await supabase
        .from('portfolio_instances')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      if (error) throw error;
      setPublishedCount(count || 0);
    } catch (err) {
      console.error('Error getting published count:', err);
    }
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);

      // First create the template
      const { data: template, error: templateError } = await supabase
        .from('portfolio_templates')
        .insert([{
          name: newTemplate.name,
          description: newTemplate.description || null,
          created_by: user?.id,
          is_active: true
        }])
        .select()
        .single();

      if (templateError) throw templateError;

      // Create initial section for student information
      const { error: sectionError } = await supabase
        .from('portfolio_sections')
        .insert([{
          template_id: template.id,
          name: 'Student Information',
          description: 'Basic student information and details',
          order_index: 0,
          is_required: true
        }]);

      if (sectionError) throw sectionError;

      setSuccess('Template created successfully');
      setShowNewTemplate(false);
      setNewTemplate({ name: '', description: '' });
      await loadTemplates();

      // Navigate to template editor after short delay
      setTimeout(() => {
        navigate(`/admin/portfolio-builder/template/${template.id}`);
      }, 500);
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTemplateStatus(templateId: string, currentStatus: boolean) {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('portfolio_templates')
        .update({ is_active: !currentStatus })
        .eq('id', templateId);
        
      if (error) throw error;
      
      setSuccess(`Template ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      await loadTemplates();
    } catch (err) {
      console.error('Error updating template status:', err);
      setError('Failed to update template status');
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <StatusMessage 
          type="error" 
          message="You do not have permission to access this page" 
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Builder</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage student portfolio templates
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button
              onClick={() => setShowNewTemplate(true)}
              icon={<Plus className="h-4 w-4" />}
            >
              New Template
            </Button>
          </div>
        </div>

        {error && <StatusMessage type="error" message={error} />}
        {success && <StatusMessage type="success" message={success} />}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Card>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Briefcase className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Templates
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {templates.filter(t => t.is_active).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Published Portfolios
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {publishedCount}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Configuration
                    </dt>
                    <dd className="text-sm text-gray-500">
                      Manage settings
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Area */}
        <Card>
          <div className="p-6">
            {templates.length > 0 ? (
              <div className="space-y-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{template.name}</h3>
                      {template.description && (
                        <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Created {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewTemplateId(template.id)}
                        icon={<Eye className="h-4 w-4" />}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                      >
                        {template.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/admin/portfolio-builder/template/${template.id}`)}
                      >
                        Edit Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first portfolio template
                </p>
                <div className="mt-6">
                  <Button
                    onClick={() => setShowNewTemplate(true)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    New Template
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* New Template Modal */}
      {showNewTemplate && (
        <Modal
          title="Create New Template"
          onClose={() => setShowNewTemplate(false)}
        >
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <FormField
              label="Template Name"
              htmlFor="templateName"
              required
            >
              <input
                type="text"
                id="templateName"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="templateDescription"
            >
              <textarea
                id="templateDescription"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </FormField>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowNewTemplate(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                loading={submitting}
              >
                Create Template
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Preview Modal */}
      {previewTemplateId && (
        <PortfolioPreview
          templateId={previewTemplateId}
          onClose={() => setPreviewTemplateId(null)}
        />
      )}
    </DashboardLayout>
  );
}