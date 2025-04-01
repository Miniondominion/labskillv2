import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Briefcase, Plus, ArrowLeft, Loader2, Trash2, GripVertical, FileText, Type, Calendar, Hash, ListPlus, Image, Link as LinkIcon, Eye } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { StatusMessage } from '../shared/StatusMessage';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '../shared/Badge';
import { PortfolioPreview } from './PortfolioPreview';

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
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

function getFieldTypeIcon(type: string) {
  switch (type) {
    case 'text':
      return <Type className="h-4 w-4 text-gray-500" />;
    case 'longtext':
      return <FileText className="h-4 w-4 text-gray-500" />;
    case 'number':
      return <Hash className="h-4 w-4 text-gray-500" />;
    case 'date':
      return <Calendar className="h-4 w-4 text-gray-500" />;
    case 'select':
    case 'multiselect':
      return <ListPlus className="h-4 w-4 text-gray-500" />;
    case 'image':
      return <Image className="h-4 w-4 text-gray-500" />;
    case 'link':
      return <LinkIcon className="h-4 w-4 text-gray-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

function SortableSection({ section, onEdit, onDelete }: { section: Section; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="bg-white shadow rounded-lg mb-4">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button {...listeners} className="mr-3 text-gray-400 hover:text-gray-600 cursor-grab">
            <GripVertical className="h-5 w-5" />
          </button>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{section.name}</h3>
            {section.description && (
              <p className="mt-1 text-sm text-gray-500">{section.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
          >
            Edit
          </Button>
          {!section.is_required && (
            <Button
              variant="danger"
              size="sm"
              onClick={onDelete}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
      
      {/* Display fields */}
      {section.fields.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Fields</h4>
          <div className="space-y-2">
            {section.fields.map((field) => (
              <div key={field.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center">
                  {getFieldTypeIcon(field.field_type)}
                  <span className="ml-2 text-sm font-medium text-gray-700">{field.label}</span>
                  {field.is_required && (
                    <Badge variant="red" size="sm" className="ml-2">Required</Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {field.field_type === 'select' || field.field_type === 'multiselect' ? 
                    `${field.field_type} (${field.options?.selectOptions?.length || 0} options)` : 
                    field.field_type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PortfolioTemplateEditor() {
  const { user } = useAuth();
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  async function loadTemplate() {
    try {
      setLoading(true);
      setError(null);

      // Load template details
      const { data: templateData, error: templateError } = await supabase
        .from('portfolio_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

      // Load sections
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

      // Process sections data
      const processedSections = sectionsData?.map(section => ({
        ...section,
        fields: (section.fields || []).sort((a, b) => a.order_index - b.order_index)
      })) || [];

      setSections(processedSections);
    } catch (err) {
      console.error('Error loading template:', err);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSection(sectionData: any) {
    try {
      setLoading(true);
      setError(null);

      if (sectionData.id) {
        // Update existing section
        const { error: sectionError } = await supabase
          .from('portfolio_sections')
          .update({
            name: sectionData.name,
            description: sectionData.description
          })
          .eq('id', sectionData.id);

        if (sectionError) throw sectionError;

        // Handle fields updates
        const existingFieldIds = sections
          .find(s => s.id === sectionData.id)?.fields
          .map(f => f.id) || [];
        
        const newFieldIds = sectionData.fields.map((f: any) => f.id);

        // Delete removed fields
        const fieldsToDelete = existingFieldIds.filter(id => !newFieldIds.includes(id));
        if (fieldsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('portfolio_fields')
            .delete()
            .in('id', fieldsToDelete);

          if (deleteError) throw deleteError;
        }

        // Update/Insert fields
        for (const field of sectionData.fields) {
          if (existingFieldIds.includes(field.id)) {
            // Update existing field
            const { error: updateError } = await supabase
              .from('portfolio_fields')
              .update(field)
              .eq('id', field.id);

            if (updateError) throw updateError;
          } else {
            // Insert new field
            const { error: insertError } = await supabase
              .from('portfolio_fields')
              .insert([{ ...field, section_id: sectionData.id }]);

            if (insertError) throw insertError;
          }
        }
      } else {
        // Create new section
        const { data: newSection, error: sectionError } = await supabase
          .from('portfolio_sections')
          .insert([{
            template_id: templateId,
            name: sectionData.name,
            description: sectionData.description,
            order_index: sections.length,
            is_required: false
          }])
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Insert fields
        if (sectionData.fields && sectionData.fields.length > 0) {
          const fieldsToInsert = sectionData.fields.map((field: any, index: number) => ({
            ...field,
            section_id: newSection.id,
            order_index: index
          }));

          const { error: fieldsError } = await supabase
            .from('portfolio_fields')
            .insert(fieldsToInsert);

          if (fieldsError) throw fieldsError;
        }
      }

      setSuccess(sectionData.id ? 'Section updated successfully' : 'Section added successfully');
      await loadTemplate();
    } catch (err) {
      console.error('Error saving section:', err);
      setError('Failed to save section');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSection(sectionId: string) {
    if (!window.confirm('Are you sure you want to delete this section? This will also delete all fields within the section.')) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('portfolio_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      setSuccess('Section deleted successfully');
      await loadTemplate();
    } catch (err) {
      console.error('Error deleting section:', err);
      setError('Failed to delete section');
    }
  }

  async function handleDragEnd(event: any) {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      
      const newSections = arrayMove(sections, oldIndex, newIndex);
      setSections(newSections);

      try {
        const updates = newSections.map((section, index) => ({
          id: section.id,
          order_index: index
        }));

        const { error } = await supabase
          .from('portfolio_sections')
          .upsert(updates);

        if (error) throw error;
      } catch (err) {
        console.error('Error updating section order:', err);
        setError('Failed to update section order');
        await loadTemplate();
      }
    }
  }

  // Calculate total fields across all sections
  const totalFields = useMemo(() => {
    return sections.reduce((total, section) => total + section.fields.length, 0);
  }, [sections]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!template) {
    return (
      <DashboardLayout>
        <StatusMessage type="error" message="Template not found" />
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
                onClick={() => navigate('/admin/portfolio-builder')}
                icon={<ArrowLeft className="h-4 w-4" />}
                className="mr-4"
              >
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                {template.description && (
                  <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowPreview(true)}
              icon={<Eye className="h-4 w-4" />}
            >
              Preview
            </Button>
            <Button
              onClick={() => navigate(`/admin/portfolio-builder/template/${templateId}/section/new`)}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Section
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
                      Sections
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {sections.length}
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
                      Fields
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalFields}
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
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Status
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {template.is_active ? (
                        <Badge variant="green">Active</Badge>
                      ) : (
                        <Badge variant="gray">Inactive</Badge>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sections */}
        <Card>
          <div className="p-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onEdit={() => {
                      navigate(`/admin/portfolio-builder/template/${templateId}/section/${section.id}`);
                    }}
                    onDelete={() => handleDeleteSection(section.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {sections.length === 0 && (
              <div className="text-center">
                <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sections</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding sections to your template
                </p>
                <div className="mt-6">
                  <Button
                    onClick={() => navigate(`/admin/portfolio-builder/template/${templateId}/section/new`)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Section
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PortfolioPreview
          templateId={templateId}
          onClose={() => setShowPreview(false)}
        />
      )}
    </DashboardLayout>
  );
}