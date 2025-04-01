import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { SectionEditor } from '../components/portfolio/SectionEditor';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/shared/Button';
import { StatusMessage } from '../components/shared/StatusMessage';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type Section = {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_required: boolean;
  fields?: any[];
};

export function SectionEditorPage() {
  const { templateId, sectionId } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
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

        // If editing existing section, load its data
        if (sectionId && sectionId !== 'new') {
          const { data: sectionData, error: sectionError } = await supabase
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
            .eq('id', sectionId)
            .single();

          if (sectionError) throw sectionError;
          setInitialData(sectionData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load section data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [templateId, sectionId]);

  async function handleSaveSection(sectionData: Section) {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (sectionId && sectionId !== 'new') {
        // Update existing section
        const { error: sectionError } = await supabase
          .from('portfolio_sections')
          .update({
            name: sectionData.name,
            description: sectionData.description
          })
          .eq('id', sectionId);

        if (sectionError) throw sectionError;

        // Process fields
        if (sectionData.fields && sectionData.fields.length > 0) {
          // Get existing fields to determine which to update/delete/insert
          const { data: existingFields, error: fieldsError } = await supabase
            .from('portfolio_fields')
            .select('id')
            .eq('section_id', sectionId);

          if (fieldsError) throw fieldsError;

          const existingFieldIds = new Set(existingFields?.map(f => f.id) || []);
          const newFieldIds = new Set(sectionData.fields.map(f => f.id));

          // Fields to delete (exist in DB but not in new data)
          const fieldsToDelete = Array.from(existingFieldIds).filter(id => !newFieldIds.has(id));
          
          if (fieldsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('portfolio_fields')
              .delete()
              .in('id', fieldsToDelete);

            if (deleteError) throw deleteError;
          }

          // Process each field - update existing or insert new
          for (const field of sectionData.fields) {
            if (existingFieldIds.has(field.id)) {
              // Update existing field
              const { error: updateError } = await supabase
                .from('portfolio_fields')
                .update({
                  name: field.name,
                  label: field.label,
                  field_type: field.field_type,
                  is_required: field.is_required,
                  options: field.options,
                  validation_rules: field.validation_rules,
                  order_index: field.order_index
                })
                .eq('id', field.id);

              if (updateError) throw updateError;
            } else {
              // Insert new field
              const { error: insertError } = await supabase
                .from('portfolio_fields')
                .insert({
                  section_id: sectionId,
                  name: field.name,
                  label: field.label,
                  field_type: field.field_type,
                  is_required: field.is_required,
                  options: field.options,
                  validation_rules: field.validation_rules,
                  order_index: field.order_index
                });

              if (insertError) throw insertError;
            }
          }
        }
      } else {
        // Create new section
        const { data: newSection, error: sectionError } = await supabase
          .from('portfolio_sections')
          .insert({
            template_id: templateId,
            name: sectionData.name,
            description: sectionData.description,
            order_index: 0, // Will be updated later
            is_required: false
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Insert fields if any
        if (sectionData.fields && sectionData.fields.length > 0) {
          const fieldsToInsert = sectionData.fields.map(field => ({
            section_id: newSection.id,
            name: field.name,
            label: field.label,
            field_type: field.field_type,
            is_required: field.is_required,
            options: field.options,
            validation_rules: field.validation_rules,
            order_index: field.order_index
          }));

          const { error: fieldsError } = await supabase
            .from('portfolio_fields')
            .insert(fieldsToInsert);

          if (fieldsError) throw fieldsError;
        }
      }

      setSuccess(sectionId && sectionId !== 'new' ? 'Section updated successfully' : 'Section added successfully');
      
      // Wait a moment before redirecting
      setTimeout(() => {
        navigate(`/admin/portfolio-builder/template/${templateId}`);
      }, 1500);
    } catch (err) {
      console.error('Error saving section:', err);
      setError(err instanceof Error ? err.message : 'Failed to save section');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
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
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => navigate(`/admin/portfolio-builder/template/${templateId}`)}
              icon={<ArrowLeft className="h-4 w-4" />}
              className="mr-4"
            >
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {sectionId === 'new' ? 'Add Section' : 'Edit Section'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {template.name}
              </p>
            </div>
          </div>
        </div>

        {error && <StatusMessage type="error" message={error} />}
        {success && <StatusMessage type="success" message={success} />}

        <div className="bg-white shadow rounded-lg">
          <SectionEditor
            onSave={handleSaveSection}
            onClose={() => navigate(`/admin/portfolio-builder/template/${templateId}`)}
            initialData={initialData || undefined}
            submitting={submitting}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}