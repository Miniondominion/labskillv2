import { useState, useEffect, useMemo } from 'react';
import { X, Eye, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { DynamicFormField } from './DynamicFormField';

type FormField = {
  id: string;
  field_name: string;
  field_type: 'text' | 'longtext' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'checkbox' | 'instructions';
  field_label: string;
  field_content?: string;
  field_options: string[] | null;
  required: boolean;
  parent_field_id?: string | null;
};

type ClinicalFormPreviewProps = {
  fields: FormField[];
  onClose: () => void;
};

export function ClinicalFormPreview({ fields, onClose }: ClinicalFormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Initialize all sections as collapsed when the preview opens
  useEffect(() => {
    const fieldsWithSubfields = fields.reduce((acc: Set<string>, field) => {
      const parentField = fields.find(f => f.id === field.parent_field_id);
      if (parentField) {
        acc.add(parentField.id);
      }
      return acc;
    }, new Set());
    
    setCollapsedSections(fieldsWithSubfields);
  }, [fields]);

  // Memoize the field hierarchy to prevent unnecessary recalculations
  const fieldHierarchy = useMemo(() => {
    return fields.reduce((acc: Record<string, any>, field) => {
      if (!field.parent_field_id) {
        if (!acc[field.id]) {
          acc[field.id] = {
            ...field,
            subfields: []
          };
        }
      } else {
        if (!acc[field.parent_field_id]) {
          acc[field.parent_field_id] = {
            ...fields.find(f => f.id === field.parent_field_id),
            subfields: []
          };
        }
        acc[field.parent_field_id].subfields.push(field);
      }
      return acc;
    }, {});
  }, [fields]);

  const toggleSection = (fieldId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const renderField = (field: FormField, isSubfield = false) => {
    const hasSubfields = fieldHierarchy[field.id]?.subfields?.length > 0;
    const isCollapsed = collapsedSections.has(field.id);

    return (
      <div 
        key={field.id} 
        className={`
          ${isSubfield ? 'ml-6' : 'mb-4 border border-form-border-200'}
          bg-form-bg-50 rounded-lg overflow-hidden shadow-form hover:shadow-form-hover
          transition-all duration-200 ease-in-out
          ${hasSubfields ? 'hover:bg-form-bg-100' : ''}
        `}
      >
        <div 
          className={`
            ${hasSubfields ? 'cursor-pointer' : ''} 
            ${isSubfield ? 'p-3' : 'p-4'}
            ${field.field_type === 'instructions' ? '' : 'border-l-4 border-indigo-500'}
            transition-all duration-200
          `}
          onClick={() => hasSubfields && toggleSection(field.id)}
          role={hasSubfields ? 'button' : undefined}
          aria-expanded={hasSubfields ? !isCollapsed : undefined}
          aria-controls={hasSubfields ? `subfields-${field.id}` : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="flex-grow">
              <DynamicFormField
                id={field.field_name}
                label={field.field_label}
                type={field.field_type}
                required={field.required}
                options={field.field_options || undefined}
                content={field.field_content}
                value={formData[field.field_name]}
                onChange={(value) => setFormData({
                  ...formData,
                  [field.field_name]: value
                })}
              />
            </div>
            {hasSubfields && (
              <div className="ml-4 transform transition-transform duration-200">
                {isCollapsed ? (
                  <ChevronDown className="h-5 w-5 text-form-bg-400" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-form-bg-400" />
                )}
              </div>
            )}
          </div>
        </div>

        {hasSubfields && !isCollapsed && (
          <div 
            id={`subfields-${field.id}`}
            className="border-t border-form-border-200 bg-form-bg-100 p-4 space-y-3"
          >
            {fieldHierarchy[field.id].subfields.map((subfield: FormField) => 
              renderField(subfield, true)
            )}
          </div>
        )}
      </div>
    );
  };

  // Separate narrative field from other fields
  const narrativeField = fields.find(field => field.field_name.toLowerCase().includes('narrative'));
  const otherFields = fields.filter(field => !field.field_name.toLowerCase().includes('narrative'));

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-form-bg-50 rounded-lg w-full max-w-[95%] md:max-w-[85%] lg:max-w-[75%] max-h-[90vh] flex flex-col">
        {/* Header - fixed */}
        <div className="flex justify-between items-center p-6 border-b border-form-border-200 bg-white rounded-t-lg flex-shrink-0">
          <div className="flex items-center">
            <Eye className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Form Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="space-y-4 max-w-5xl mx-auto">
            {/* Regular Form Fields */}
            {Object.values(fieldHierarchy)
              .filter(field => !field.parent_field_id && field.id !== narrativeField?.id)
              .map(field => renderField(field))}

            {/* Narrative Field */}
            {narrativeField && (
              <div className="mt-8 border-t border-form-border-200 pt-8 max-w-5xl mx-auto">
                {renderField(narrativeField)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-form-border-200 bg-white rounded-b-lg flex-shrink-0">
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}