import { useState, useEffect } from 'react';
import { FormField } from '../shared/FormField';
import { Button } from '../shared/Button';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { FieldEditor } from './FieldEditor';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Field = {
  id: string;
  name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options?: any;
  validation_rules?: any;
  order_index: number;
};

type Section = {
  id?: string;
  name: string;
  description: string;
  fields: Field[];
};

type Props = {
  onSave: (section: Section) => Promise<void>;
  onClose: () => void;
  initialData?: Section;
  submitting?: boolean;
};

type ValidationError = {
  field: string;
  message: string;
};

function SortableField({ field, onEdit, onDelete }: { field: Field; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button {...listeners} className="mr-3 text-gray-400 hover:text-gray-600 cursor-grab">
            <GripVertical className="h-5 w-5" />
          </button>
          <div>
            <h4 className="text-sm font-medium text-gray-900">{field.label}</h4>
            <p className="mt-1 text-sm text-gray-500">
              Type: {field.field_type}
              {field.is_required && ' (Required)'}
            </p>
            {field.field_type === 'dynamic' && field.options && (
              <p className="mt-1 text-xs text-gray-500">
                Data Source: {field.options.dataSource}, Aggregation: {field.options.aggregation}
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SectionEditor({ onSave, onClose, initialData, submitting = false }: Props) {
  const [section, setSection] = useState<Section>({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    description: initialData?.description || '',
    fields: initialData?.fields || []
  });
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update local state when initialData changes
  useEffect(() => {
    if (initialData) {
      setSection({
        id: initialData.id,
        name: initialData.name,
        description: initialData.description,
        fields: initialData.fields
      });
    }
  }, [initialData]);

  // Validate fields for required properties and data types
  const validateFields = (fields: Field[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    fields.forEach((field, index) => {
      // Check for required field properties
      if (!field.name) {
        errors.push({ field: `Field ${index + 1}`, message: 'Field name is required' });
      }
      
      if (!field.label) {
        errors.push({ field: `Field ${index + 1}`, message: 'Field label is required' });
      }
      
      if (!field.field_type) {
        errors.push({ field: `Field ${index + 1}`, message: 'Field type is required' });
      }
      
      // Validate field name format (only letters, numbers, and underscores)
      const fieldNameRegex = /^[a-zA-Z0-9_]+$/;
      if (field.name && !fieldNameRegex.test(field.name)) {
        errors.push({ 
          field: `Field ${index + 1} (${field.label})`, 
          message: 'Field name can only contain letters, numbers, and underscores' 
        });
      }
      
      // Validate select/multiselect options
      if (['select', 'multiselect'].includes(field.field_type) && 
          (!field.options?.selectOptions || field.options.selectOptions.length === 0)) {
        errors.push({ 
          field: `Field ${index + 1} (${field.label})`, 
          message: 'Select fields must have at least one option' 
        });
      }
      
      // Validate dynamic field configuration
      if (field.field_type === 'dynamic') {
        if (!field.options?.dataSource) {
          errors.push({ 
            field: `Field ${index + 1} (${field.label})`, 
            message: 'Dynamic fields must have a data source' 
          });
        }
        
        if (!field.options?.dataField) {
          errors.push({ 
            field: `Field ${index + 1} (${field.label})`, 
            message: 'Dynamic fields must have a data field' 
          });
        }
      }
    });
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Set local submitting state to prevent multiple submissions
      setIsSubmitting(true);
      setLocalError(null);
      
      // Validate section name
      if (!section.name.trim()) {
        setLocalError("Section name is required");
        setIsSubmitting(false);
        return;
      }
      
      // Ensure fields have unique names
      const fieldNames = new Set<string>();
      for (const field of section.fields) {
        if (fieldNames.has(field.name)) {
          setLocalError(`Duplicate field name: ${field.name}`);
          setIsSubmitting(false);
          return;
        }
        fieldNames.add(field.name);
      }
      
      // Validate fields
      const fieldErrors = validateFields(section.fields);
      if (fieldErrors.length > 0) {
        const errorMessages = fieldErrors.map(err => `${err.field}: ${err.message}`).join('\n');
        setLocalError(`Please fix the following errors:\n${errorMessages}`);
        setIsSubmitting(false);
        return;
      }
      
      // Call the onSave prop with the section data
      await onSave({
        id: section.id,
        name: section.name,
        description: section.description,
        fields: section.fields.map((field, index) => ({
          ...field,
          order_index: index
        }))
      });
    } catch (error) {
      console.error("Error saving section:", error);
      setLocalError(error instanceof Error ? error.message : "Failed to save section");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveField = async (fieldData: any) => {
    try {
      // Validate field data
      if (!fieldData.name || !fieldData.label || !fieldData.field_type) {
        throw new Error("Field name, label, and type are required");
      }
      
      // Validate field name format
      const fieldNameRegex = /^[a-zA-Z0-9_]+$/;
      if (!fieldNameRegex.test(fieldData.name)) {
        throw new Error("Field name can only contain letters, numbers, and underscores");
      }
      
      // Check for duplicate field names
      const existingField = section.fields.find(f => 
        f.id !== (editingField?.id) && f.name === fieldData.name
      );
      
      if (existingField) {
        throw new Error(`A field with name "${fieldData.name}" already exists`);
      }
      
      // Update or add the field
      const updatedFields = editingField
        ? section.fields.map(f => f.id === editingField.id ? { ...fieldData, id: f.id } : f)
        : [...section.fields, { ...fieldData, id: crypto.randomUUID() }];

      setSection({
        ...section,
        fields: updatedFields.map((f, index) => ({ ...f, order_index: index }))
      });
      
      setShowFieldEditor(false);
      setEditingField(null);
    } catch (error) {
      console.error("Error saving field:", error);
      setLocalError(error instanceof Error ? error.message : "Failed to save field");
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = section.fields.findIndex(f => f.id === active.id);
      const newIndex = section.fields.findIndex(f => f.id === over.id);

      setSection({
        ...section,
        fields: arrayMove(section.fields, oldIndex, newIndex).map((f, index) => ({
          ...f,
          order_index: index
        }))
      });
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-auto p-6">
        {localError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative whitespace-pre-line">
            {localError}
          </div>
        )}
        
        <form id="sectionForm" onSubmit={handleSubmit} className="space-y-6">
          <FormField
            label="Section Name"
            htmlFor="name"
            required
          >
            <input
              type="text"
              id="name"
              value={section.name}
              onChange={(e) => setSection({ ...section, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
          >
            <textarea
              id="description"
              value={section.description}
              onChange={(e) => setSection({ ...section, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </FormField>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900">Fields</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingField(null);
                  setShowFieldEditor(true);
                }}
                icon={<Plus className="h-4 w-4" />}
              >
                Add Field
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={section.fields.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {section.fields.map((field: Field) => (
                    <SortableField
                      key={field.id}
                      field={field}
                      onEdit={() => {
                        setEditingField(field);
                        setShowFieldEditor(true);
                      }}
                      onDelete={() => {
                        setSection({
                          ...section,
                          fields: section.fields.filter(f => f.id !== field.id)
                        });
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {section.fields.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">
                  No fields added yet. Click "Add Field" to create fields for this section.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="sectionForm"
            loading={submitting || isSubmitting}
            disabled={submitting || isSubmitting}
          >
            {initialData?.id ? 'Update Section' : 'Add Section'}
          </Button>
        </div>
      </div>

      {showFieldEditor && (
        <FieldEditor
          onSave={handleSaveField}
          onClose={() => {
            setShowFieldEditor(false);
            setEditingField(null);
          }}
          initialData={editingField}
        />
      )}
    </div>
  );
}