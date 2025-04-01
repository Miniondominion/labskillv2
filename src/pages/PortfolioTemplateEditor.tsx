import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Briefcase, Plus, ArrowLeft, Loader2, Trash2, GripVertical } from 'lucide-react';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { StatusMessage } from '../components/shared/StatusMessage';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
};

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
        .select('*')
        .eq('template_id', templateId)
        .order('order_index');

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
    } catch (err) {
      console.error('Error loading template:', err);
      setError('Failed to load template');
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
          <div className="mt-4 sm:mt-0">
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
                    onEdit={() => navigate(`/admin/portfolio-builder/template/${templateId}/section/${section.id}`)}
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
    </DashboardLayout>
  );
}