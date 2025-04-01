import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Calendar, Link as LinkIcon, Download, FileText, Image, User, Lock } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { Badge } from '../shared/Badge';
import { supabase } from '../../lib/supabase';

type PortfolioPreviewProps = {
  templateId: string;
  onClose: () => void;
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
  value?: any; // Sample value for preview
};

export function PortfolioPreview({ templateId, onClose }: PortfolioPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [templateName, setTemplateName] = useState('');
  const [showPrivateData, setShowPrivateData] = useState(true);

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  async function loadTemplate() {
    try {
      setLoading(true);
      setError(null);

      // Load template details
      const { data: templateData, error: templateError } = await supabase
        .from('portfolio_templates')
        .select('name')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;
      setTemplateName(templateData.name);

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
        .eq('template_id', templateId)
        .order('order_index');

      if (sectionsError) throw sectionsError;

      // Process sections and add sample data
      const processedSections = sectionsData?.map(section => {
        const fields = (section.fields || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(field => ({
            ...field,
            value: generateSampleValue(field)
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
      console.error('Error loading template:', err);
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  }

  const generateSampleValue = (field: Field) => {
    // Check if it's a dynamic field with user data source
    if (field.field_type === 'dynamic' && field.options?.dataSource === 'user') {
      switch (field.options.dataField) {
        case 'full_name':
          return 'John Doe';
        case 'email':
          return 'john.doe@example.com';
        case 'role':
          return 'Student';
        case 'created_at':
          return '2025-01-15';
        default:
          return 'User data';
      }
    }

    switch (field.field_type) {
      case 'text':
        return field.name.includes('name') ? 'John Doe' : 
               field.name.includes('email') ? 'john.doe@example.com' :
               field.name.includes('phone') ? '(555) 123-4567' :
               'Sample text value';
      
      case 'longtext':
        return 'This is a sample long text value that demonstrates how longer content would appear in the portfolio. It provides a realistic preview of text formatting and wrapping behavior.';
      
      case 'number':
        return 42;
      
      case 'date':
        return '2025-01-15';
      
      case 'select':
        return field.options?.selectOptions?.[0] || 'Option 1';
      
      case 'multiselect':
        return field.options?.selectOptions?.slice(0, 2) || ['Option 1', 'Option 2'];
      
      case 'link':
        return 'https://example.com';
      
      case 'image':
        return 'https://images.unsplash.com/photo-1579165466741-7f35e4755183?q=80&w=300&auto=format&fit=crop';
      
      case 'file':
        return 'https://example.com/sample-file.pdf';
      
      case 'skill_list':
        return [
          { name: 'IV Administration', category: 'Clinical Skills' },
          { name: 'CPR', category: 'Emergency Care' },
          { name: 'Patient Assessment', category: 'Assessment' }
        ];
      
      case 'clinical_list':
        return [
          { name: 'Hospital Rotation', date: '2025-01-10', hours: 8 },
          { name: 'Ambulance Shift', date: '2025-01-15', hours: 12 }
        ];
      
      case 'dynamic':
        if (field.options?.dataSource === 'skills') {
          return 24;
        } else if (field.options?.dataSource === 'clinical') {
          return 120;
        }
        return 'Dynamic data';
      
      default:
        return 'Sample value';
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

  const renderFieldValue = (field: Field) => {
    // Check if field is private and privacy is enabled
    const isPrivate = field.options?.isPrivate;
    if (isPrivate && !showPrivateData) {
      return (
        <div className="flex items-center text-gray-500">
          <Lock className="h-4 w-4 mr-1" />
          <span className="italic">Private information</span>
        </div>
      );
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
            href="#" 
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
            href="#" 
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
        if (field.options?.dataSource === 'user') {
          return (
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-500 mr-2" />
              <span className="font-medium">{field.value}</span>
            </div>
          );
        }
        return <span className="font-semibold">{field.value}</span>;
      
      default:
        return <span>{JSON.stringify(field.value)}</span>;
    }
  };

  return (
    <Modal
      title={`Preview: ${templateName}`}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-6">
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-indigo-700">
              This is a preview of how the portfolio will appear to viewers. Sample data is shown for demonstration purposes.
            </p>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPrivateData(!showPrivateData)}
                icon={showPrivateData ? <Lock className="h-4 w-4" /> : <User className="h-4 w-4" />}
              >
                {showPrivateData ? 'Hide Private Data' : 'Show Private Data'}
              </Button>
            </div>
          </div>
        </div>

        {/* Portfolio Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
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
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6 bg-gray-50">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    {section.fields.map((field) => {
                      const isPrivate = field.options?.isPrivate;
                      
                      return (
                        <div key={field.id} className={field.field_type === 'longtext' || field.field_type === 'image' ? 'sm:col-span-2' : ''}>
                          <dt className="text-sm font-medium text-gray-500 flex items-center">
                            {field.label}
                            {field.is_required && <span className="ml-1 text-red-500">*</span>}
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
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}