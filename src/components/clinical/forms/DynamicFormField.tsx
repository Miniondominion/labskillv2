import { FormField } from '../../shared/FormField';

type FieldType = 'text' | 'longtext' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'checkbox' | 'instructions';

type FieldProps = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  value: any;
  onChange: (value: any) => void;
  content?: string;
};

export function DynamicFormField({
  id,
  label,
  type,
  required,
  options,
  value,
  onChange,
  content
}: FieldProps) {
  // For instructions type, render the rich text content
  if (type === 'instructions') {
    console.log("Content Prop:", content); // ADD THIS LINE
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="w-full">
            <h4 className="text-sm font-medium text-indigo-800 mb-2">{label}</h4>
            <div 
              className="prose prose-sm max-w-none text-indigo-700"
              dangerouslySetInnerHTML={{ __html: content || '' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <FormField
      label={label}
      htmlFor={id}
      required={required}
    >
      {type === 'select' && (
        <select
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="form-select mt-1 block w-full rounded-lg border-form-border-300 bg-white shadow-form focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
          required={required}
        >
          <option value="">Select an option</option>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )} 
      
      {type === 'multiselect' && (
        <div className="mt-3 space-y-3">
          {options?.map((option) => (
            <label 
              key={option} 
              className="flex items-center p-3 bg-white rounded-lg border border-form-border-200 hover:border-indigo-200 transition-colors"
            >
              <input
                type="checkbox"
                checked={Array.isArray(value) ? value.includes(option) : false}
                onChange={(e) => {
                  const currentValue = Array.isArray(value) ? value : [];
                  if (e.target.checked) {
                    onChange([...currentValue, option]);
                  } else {
                    onChange(currentValue.filter(v => v !== option));
                  }
                }}
                className="form-checkbox h-5 w-5 rounded border-form-border-300 text-indigo-600 shadow-form focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
              />
              <span className="ml-3 text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      )}
      
      {type === 'checkbox' && (
        <div className="mt-2">
          <label className="flex items-center p-3 bg-white rounded-lg border border-form-border-200 hover:border-indigo-200 transition-colors">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="form-checkbox h-5 w-5 rounded border-form-border-300 text-indigo-600 shadow-form focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
              required={required}
            />
            <span className="ml-3 text-sm text-gray-700">Yes</span>
          </label>
        </div>
      )}
      
      {type === 'longtext' && (
        <textarea
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="form-textarea mt-1 block w-full rounded-lg border-form-border-300 bg-white shadow-form focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
          required={required}
        />
      )}

      {(type === 'text' || type === 'number' || type === 'date' || type === 'time') && (
        <input
          type={type}
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="form-input mt-1 block w-full rounded-lg border-form-border-300 bg-white shadow-form focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
          required={required}
        />
      )}
    </FormField>
  );
}