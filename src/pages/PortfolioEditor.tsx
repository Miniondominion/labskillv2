import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Briefcase, ArrowLeft, Loader2, Save, Eye, CheckCircle, AlertCircle } from 'lucide-react';
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
};

export function PortfolioEditor() {
  const { user } = useAuth();
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [instance, setInstance] = useState<PortfolioInstance | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (instanceId) {
      loadPortfolio();
    }
  }, [instanceId, user]);

  async function loadPortfolio() {
    try {
      setLoading(true);
      setError(null);

      // First check if user is authorized to edit this portfolio
      if (!user) {
        throw new Error('You must be logged in to edit portfolios');
      }

      // Load portfolio instance
      const { data: instanceData, error: instanceError } = await supabase
        .from('portfolio_instances')
        .select(`
          *,
          template:portfolio_templates (
            name,
            description
          )
        `)
        .eq('id', instanceId)
        .single();

      if (instanceError) throw instanceError;
      
      // Check if user is the owner of this portfolio
      if (instanceData.student_id !== user.id) {
        throw new Error('You can only edit your own portfolios');
      }

      setInstance(instanceData);

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

      // Process sections and fields
      const processedSections = sectionsData?.map(section => {
        const fields = (section.fields || []).sort((a, b) => a.order_index - b.order_index);
        return {
          ...section,
          fields
        };
      }) || [];

      setSections(processedSections);
      
      // Initialize form data with existing values
      const initialData: Record<string, any> = {};
      portfolioData?.forEach(item => {
        initialData[item.field_id] = item.value;
      });
      setFormData(initialData);
      
      // Expand all sections by default
      setExpandedSections(new Set(processedSections.map(s => s.id)));
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(publish = false) {
    try {
      if (publish) {
        setPublishing(true);
      } else {
        setSaving(true);
      }
      setError(null);
      setSuccess(null);
      setValidationErrors({});

      if (!instance) return;

      // Validate required fields if publishing
      if (publish) {
        const errors: Record<string, string> = {};
        let hasErrors = false;

        sections.forEach(section => {
          section.fields.forEach(field => {
            if (field.is_required && (!formData[field.id] || 
                (Array.isArray(formData[field.id]) && formData[field.id].length === 0))) {
              errors[field.id] = `${field.label} is required`;
              hasErrors = true;
            }
          });
        });

        if (hasErrors) {
          setValidationErrors(errors);
          throw new Error('Please fill in all required fields');
        }
      }

      // Prepare data for upsert
      const dataToUpsert = Object.entries(formData).map(([fieldId, value]) => ({
        instance_id: instanceId,
        field_id: fieldId,
        value
      }));

      // Upsert portfolio data
      const { error: upsertError } = await supabase
        .from('portfolio_data')
        .upsert(dataToUpsert, {
          onConflict: 'instance_id,field_id',
          ignoreDuplicates: false
        });

      if (upsertError) throw upsertError;

      // Update portfolio status if publishing
      if (publish) {
        const { error: updateError } = await supabase
          .from('portfolio_instances')
          .update({
            status: 'published',
            published_at: new Date().toISOString()
          })
          .eq('id', instanceId);

        if (updateError) throw updateError;
        
        setInstance(prev => prev ? {
          ...prev,
          status: 'published',
          published_at: new Date().toISOString()
        } : null);
      }

      setSuccess(publish ? 'Portfolio published successfully' : 'Portfolio saved successfully');
      
      // Redirect to view page if published
      if (publish) {
        setTimeout(() => {
          navigate(`/portfolio/view/${instanceId}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to save portfolio');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear validation error for this field if it exists
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

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

  const renderField = (field: Field) => {
    const value = formData[field.id];
    const error = validationErrors[field.id];

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
        );
      
      case 'longtext':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            rows={4}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
        );
      
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          >
            <option value="">Select an option</option>
            {field.options?.selectOptions?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <div className="mt-2 space-y-2">
            {field.options?.selectOptions?.map((option: string, index: number) => (
              <div key={index} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${field.id}-${index}`}
                  checked={Array.isArray(value) ? value.includes(option) : false}
                  onChange={(e) => {
                    const currentValue = Array.isArray(value) ? [...value] : [];
                    if (e.target.checked) {
                      handleFieldChange(field.id, [...currentValue, option]);
                    } else {
                      handleFieldChange(field.id, currentValue.filter(v => v !== option));
                    }
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor={`${field.id}-${index}`} className="ml-2 block text-sm text-gray-900">
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      
      case 'link':
        return (
          <input
            type="url"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder="https://example.com"
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
        );
      
      case 'image':
      case 'file':
        return (
          <div className="mt-1">
            <input
              type="url"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder="Enter URL to image/file"
              className={`block w-full rounded-md shadow-sm sm:text-sm ${
                error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter a URL to your {field.field_type === 'image' ? 'image' : 'file'}
            </p>
            {value && field.field_type === 'image' && (
              <img 
                src={value} 
                alt="Preview" 
                className="mt-2 max-w-full h-auto max-h-32 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        );
      
      case 'skill_list':
      case 'clinical_list':
        // These fields are typically populated dynamically
        return (
          <div className="mt-1 text-sm text-gray-500 italic">
            This field will be automatically populated based on your completed {field.field_type === 'skill_list' ? 'skills' : 'clinical documentation'}
          </div>
        );
      
      case 'dynamic':
        // Dynamic fields are read-only
        return (
          <div className="mt-1 text-sm text-gray-500 italic">
            This field will be automatically calculated
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
        );
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

  if (error && !instance) {
    return (
      <DashboardLayout>
        <StatusMessage type="error" message={error} />
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
                  <h1 className="text-2xl font-bold text-gray-900">
                    {instance?.template.name || 'Edit Portfolio'}
                  </h1>
                  {instance && (
                    <Badge 
                      variant={instance.status === 'published' ? 'green' : 'yellow'} 
                      className="ml-3"
                    >
                      {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                    </Badge>
                  )}
                </div>
                {instance?.template.description && (
                  <p className="mt-1 text-sm text-gray-500">{instance.template.description}</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => navigate(`/portfolio/view/${instanceId}`)}
              icon={<Eye className="h-4 w-4" />}
            >
              Preview
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSave(false)}
              disabled={saving || publishing}
              loading={saving}
              icon={<Save className="h-4 w-4" />}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving || publishing}
              loading={publishing}
              icon={<CheckCircle className="h-4 w-4" />}
            >
              Publish
            </Button>
          </div>
        </div>

        {error && <StatusMessage type="error" message={error} />}
        {success && <StatusMessage type="success" message={success} />}

        {/* Form */}
        <form className="space-y-6">
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
                  <div className="space-y-6">
                    {section.fields.map((field) => {
                      const error = validationErrors[field.id];
                      
                      return (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700">
                            {field.label}
                            {field.is_required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderField(field)}
                          {error && (
                            <p className="mt-1 text-sm text-red-600">{error}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </form>
      </div>
    </DashboardLayout>
  );
}