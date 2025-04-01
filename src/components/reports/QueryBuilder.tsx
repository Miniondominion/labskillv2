import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Filter, Search, ChevronDown, ChevronUp, Info, FileText, ClipboardList, Hash, Eye } from 'lucide-react';
import { Button } from '../shared/Button';
import { Select } from '../shared/Select';
import { FormField } from '../shared/FormField';
import { Card } from '../shared/Card';
import { supabase } from '../../lib/supabase';
import { ReportPreview } from './ReportPreview';

type QueryCondition = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

type FieldNode = {
  id: string;
  name: string;
  type: string;
  table: string;
  children?: FieldNode[];
};

type Props = {
  config: any;
  onChange: (config: any) => void;
  onClose: () => void;
};

type ClinicalType = {
  id: string;
  name: string;
  forms: {
    id: string;
    name: string;
    fields: {
      id: string;
      field_name: string;
      field_label: string;
      field_type: string;
      field_options?: string[];
    }[];
  }[];
};

type Skill = {
  id: string;
  name: string;
  category_name: string;
  form_schema: {
    questions: {
      id: string;
      question_text: string;
      response_type: string;
      is_required: boolean;
      options?: string[];
    }[];
  };
};

type FieldOptions = {
  [fieldId: string]: string[];
};

type FieldLabels = {
  [fieldId: string]: string;
};

type FieldTypes = {
  [fieldId: string]: string;
};

export function QueryBuilder({ config, onChange, onClose }: Props) {
  const [queryName, setQueryName] = useState(config?.name || '');
  const [queryDescription, setQueryDescription] = useState(config?.description || '');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLDivElement>(null);
  const [selectedFormForCount, setSelectedFormForCount] = useState<string>('');
  const [countIfConditions, setCountIfConditions] = useState<QueryCondition[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [dataSource, setDataSource] = useState<'clinical' | 'skills'>('clinical');
  const [clinicalTypes, setClinicalTypes] = useState<ClinicalType[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [fieldOptions, setFieldOptions] = useState<FieldOptions>({});
  const [fieldLabels, setFieldLabels] = useState<FieldLabels>({});
  const [fieldTypes, setFieldTypes] = useState<FieldTypes>({});

  const submissionCountField: FieldNode = {
    id: 'submission_count',
    name: 'Submission Count',
    type: 'number',
    table: 'submissions'
  };

  const fields: FieldNode[] = [
    {
      id: 'metrics',
      name: 'Metrics',
      type: 'group',
      table: 'metrics',
      children: [
        submissionCountField
      ]
    },
    {
      id: 'skill_logs',
      name: 'Lab Skills',
      type: 'group',
      table: 'skill_logs',
      children: []
    },
    {
      id: 'clinical_entries',
      name: 'Clinical Documentation',
      type: 'group',
      table: 'clinical_entries',
      children: []
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const { data: typesData, error: typesError } = await supabase
        .from('clinical_types')
        .select(`
          id,
          name,
          forms:clinical_forms (
            id,
            name,
            fields:clinical_form_fields (
              id,
              field_name,
              field_label,
              field_type,
              field_options
            )
          )
        `);

      if (typesError) throw typesError;

      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select(`
          id,
          name,
          skill_categories (
            name
          ),
          form_schema
        `);

      if (skillsError) throw skillsError;

      setClinicalTypes(typesData || []);
      setSkills(skillsData?.map(skill => ({
        id: skill.id,
        name: skill.name,
        category_name: skill.skill_categories?.name || 'Uncategorized',
        form_schema: skill.form_schema || { questions: [] }
      })) || []);

      const options: FieldOptions = {};
      const labels: FieldLabels = {};
      const types: FieldTypes = {};

      labels[submissionCountField.id] = 'Total Submissions';
      types[submissionCountField.id] = 'number';

      typesData?.forEach(type => {
        type.forms?.forEach(form => {
          form.fields?.forEach(field => {
            labels[field.id] = `${field.field_label} (${type.name} - ${form.name})`;
            types[field.id] = field.field_type;
            if (field.field_type === 'select' || field.field_type === 'multiselect') {
              options[field.id] = field.field_options || [];
            }
          });
        });
      });

      skillsData?.forEach(skill => {
        skill.form_schema?.questions?.forEach(question => {
          labels[question.id] = `${question.question_text} (${skill.name})`;
          types[question.id] = question.response_type;
          if (question.response_type === 'multiple_choice' || question.response_type === 'select_multiple') {
            options[question.id] = question.options || [];
          }
        });
      });

      setFieldOptions(options);
      setFieldLabels(labels);
      setFieldTypes(types);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load forms and skills');
    } finally {
      setLoading(false);
    }
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const getFieldType = (fieldId: string): string | undefined => {
    return fieldTypes[fieldId];
  };

  const getOperatorOptions = (fieldId: string) => {
    if (fieldId === 'submission_count') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'less_than', label: 'Less Than' },
        { value: 'greater_equal', label: 'Greater Than or Equal' },
        { value: 'less_equal', label: 'Less Than or Equal' }
      ];
    }

    const fieldType = getFieldType(fieldId);
    
    if (!fieldType) return [
      { value: 'equals', label: 'Equals' }
    ];

    switch (fieldType) {
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greater_than', label: 'Greater Than' },
          { value: 'less_than', label: 'Less Than' },
          { value: 'greater_equal', label: 'Greater Than or Equal' },
          { value: 'less_equal', label: 'Less Than or Equal' }
        ];
      case 'select':
      case 'multiple_choice':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Does Not Equal' }
        ];
      case 'multiselect':
      case 'select_multiple':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does Not Contain' },
          { value: 'contains_all', label: 'Contains All' }
        ];
      default:
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'starts_with', label: 'Starts With' },
          { value: 'ends_with', label: 'Ends With' }
        ];
    }
  };

  const renderValueInput = (condition: QueryCondition, onValueChange: (value: string) => void) => {
    if (condition.field === 'submission_count') {
      return (
        <div className="flex space-x-2 flex-1">
          <Select
            value={selectedFormForCount}
            onChange={setSelectedFormForCount}
            options={[
              { value: '', label: 'All Forms' },
              ...clinicalTypes.flatMap(type => 
                type.forms?.map(form => ({
                  value: form.id,
                  label: `${type.name} - ${form.name}`
                })) || []
              ),
              ...skills.map(skill => ({
                value: skill.id,
                label: `${skill.name} (Skill)`
              }))
            ]}
            className="w-64"
          />
          <input
            type="number"
            min="0"
            value={condition.value}
            onChange={(e) => onValueChange(e.target.value)}
            className="flex-1 form-input block rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      );
    }

    const fieldType = getFieldType(condition.field);
    const options = fieldOptions[condition.field];

    if (!fieldType) {
      return (
        <input
          type="text"
          value={condition.value}
          onChange={(e) => onValueChange(e.target.value)}
          className="flex-1 form-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      );
    }

    switch (fieldType) {
      case 'number':
        return (
          <input
            type="number"
            value={condition.value}
            onChange={(e) => onValueChange(e.target.value)}
            className="flex-1 form-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        );

      case 'select':
      case 'multiple_choice':
      case 'multiselect':
      case 'select_multiple':
        if (options && options.length > 0) {
          return (
            <Select
              value={condition.value}
              onChange={onValueChange}
              options={[
                { value: '', label: 'Select an option...' },
                ...options.map(opt => ({
                  value: opt,
                  label: opt
                }))
              ]}
              className="flex-1"
            />
          );
        }
        // Fallback to text input if no options are available
        return (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => onValueChange(e.target.value)}
            className="flex-1 form-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        );

      default:
        return (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => onValueChange(e.target.value)}
            className="flex-1 form-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        );
    }
  };

  const handleSave = () => {
    if (!queryName.trim()) {
      alert('Please enter a query name');
      return;
    }

    onChange({
      ...config,
      name: queryName.trim(),
      description: queryDescription.trim(),
      selectedFields: Array.from(selectedFields),
      dataSource,
      formSpecificCount: selectedFormForCount || null,
      countIfConditions
    });
    onClose();
  };

  useEffect(() => {
    setSelectedType('');
    setSelectedForm('');
    setSelectedQuestions(new Set());
    setSelectedFields(new Set());
  }, [dataSource]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <FormField
            label="Query Name"
            htmlFor="queryName"
            required
          >
            <input
              type="text"
              id="queryName"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              className="form-input block w-full rounded-lg"
              placeholder="Enter query name..."
              required
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="queryDescription"
          >
            <textarea
              id="queryDescription"
              value={queryDescription}
              onChange={(e) => setQueryDescription(e.target.value)}
              className="form-textarea block w-full rounded-lg"
              placeholder="Enter query description..."
              rows={2}
            />
          </FormField>

          <FormField
            label="Data Source"
            htmlFor="dataSource"
            required
          >
            <Select
              value={dataSource}
              onChange={(value) => setDataSource(value as 'clinical' | 'skills')}
              options={[
                { value: 'clinical', label: 'Clinical Documentation' },
                { value: 'skills', label: 'Skills' }
              ]}
            />
          </FormField>
        </div>
      </Card>

      <Card>
        <div className="p-4">
          <div className="flex items-center mb-4">
            <Hash className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Metrics</h3>
          </div>

          <div className="space-y-2">
            <label className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.has('submission_count')}
                onChange={() => toggleField('submission_count')}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <div className="ml-2">
                <div className="text-sm font-medium text-gray-900">Submission Count</div>
                <div className="text-xs text-gray-500">Total number of form submissions</div>
              </div>
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-4">
          <div className="flex items-center mb-4">
            {dataSource === 'clinical' ? (
              <ClipboardList className="h-5 w-5 text-indigo-600 mr-2" />
            ) : (
              <FileText className="h-5 w-5 text-indigo-600 mr-2" />
            )}
            <h3 className="text-lg font-medium text-gray-900">
              {dataSource === 'clinical' ? 'Clinical Documentation' : 'Skills'}
            </h3>
          </div>

          <div className="space-y-4">
            {dataSource === 'clinical' ? (
              <>
                <FormField
                  label="Clinical Type"
                  htmlFor="clinicalType"
                >
                  <Select
                    value={selectedType}
                    onChange={setSelectedType}
                    options={[
                      { value: '', label: 'Select a type...' },
                      ...clinicalTypes.map(type => ({
                        value: type.id,
                        label: type.name
                      }))
                    ]}
                  />
                </FormField>

                {selectedType && (
                  <FormField
                    label="Form"
                    htmlFor="form"
                  >
                    <Select
                      value={selectedForm}
                      onChange={setSelectedForm}
                      options={[
                        { value: '', label: 'Select a form...' },
                        ...(clinicalTypes
                          .find(t => t.id === selectedType)
                          ?.forms.map(form => ({
                            value: form.id,
                            label: form.name
                          })) || [])
                      ]}
                    />
                  </FormField>
                )}

                {selectedForm && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Fields
                    </label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {clinicalTypes
                        .find(t => t.id === selectedType)
                        ?.forms.find(f => f.id === selectedForm)
                        ?.fields.map(field => (
                          <div
                            key={field.id}
                            className="flex items-center p-2 hover:bg-gray-50 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              id={field.id}
                              checked={selectedFields.has(field.id)}
                              onChange={() => toggleField(field.id)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor={field.id} className="ml-2 block text-sm text-gray-900">
                              {field.field_label}
                              <span className="ml-2 text-xs text-gray-500">({field.field_type})</span>
                              {(field.field_type === 'select' || field.field_type === 'multiselect') && field.field_options && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Options: {field.field_options.join(', ')}
                                </div>
                              )}
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search skills..."
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full"
                  />
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {skills
                    .filter(skill => 
                      !searchTerm || 
                      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      skill.category_name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(skill => (
                      <div key={skill.id} className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{skill.name}</div>
                            <div className="text-xs text-gray-500">{skill.category_name}</div>
                          </div>
                          <button
                            onClick={() => toggleNode(skill.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedNodes.has(skill.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {expandedNodes.has(skill.id) && skill.form_schema?.questions && (
                          <div className="pl-4 space-y-2">
                            {skill.form_schema.questions.map(question => (
                              <div
                                key={question.id}
                                className="flex items-center p-2 hover:bg-gray-50 rounded-lg"
                              >
                                <input
                                  type="checkbox"
                                  id={question.id}
                                  checked={selectedFields.has(question.id)}
                                  onChange={() => toggleField(question.id)}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor={question.id} className="ml-2 block text-sm text-gray-900">
                                  {question.question_text}
                                  <span className="ml-2 text-xs text-gray-500">({question.response_type})</span>
                                  {(question.response_type === 'multiple_choice' || question.response_type === 'select_multiple') && question.options && (
                                    <div className="mt-1 text-xs text-gray-500">
                                      Options: {question.options.join(', ')}
                                    </div>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Count If Conditions */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Count If Conditions</h3>
            <Button
              variant="secondary"
              onClick={() => setCountIfConditions([...countIfConditions, { id: crypto.randomUUID(), field: '', operator: 'equals', value: '' }])}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Condition
            </Button>
          </div>

          <div className="space-y-4">
            {countIfConditions.map((condition, index) => (
              <div
                key={condition.id}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-scale-in"
              >
                <Select
                  value={condition.field}
                  onChange={(value) => {
                    const updatedConditions = [...countIfConditions];
                    updatedConditions[index] = { ...condition, field: value };
                    setCountIfConditions(updatedConditions);
                  }}
                  options={[
                    { value: '', label: 'Select field...' },
                    ...Array.from(selectedFields).map(field => ({
                      value: field,
                      label: fieldLabels[field] || field
                    }))
                  ]}
                  className="flex-1"
                />
                <Select
                  value={condition.operator}
                  onChange={(value) => {
                    const updatedConditions = [...countIfConditions];
                    updatedConditions[index] = { ...condition, operator: value };
                    setCountIfConditions(updatedConditions);
                  }}
                  options={getOperatorOptions(condition.field)}
                  className="flex-1"
                />
                {renderValueInput(condition, (value) => {
                  const updatedConditions = [...countIfConditions];
                  updatedConditions[index] = { ...condition, value };
                  setCountIfConditions(updatedConditions);
                })}
                <Button
                  variant="danger"
                  onClick={() => {
                    const updatedConditions = [...countIfConditions];
                    updatedConditions.splice(index, 1);
                    setCountIfConditions(updatedConditions);
                  }}
                  icon={<Trash2 className="h-4 w-4" />}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {selectedFields.has('submission_count') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Submission Count Information</h4>
              <p className="mt-1 text-sm text-blue-700">
                {selectedFormForCount ? (
                  <>
                    The submission count will be calculated for the selected form only.
                    This helps track completion rates for specific forms or skills.
                  </>
                ) : (
                  <>
                    The submission count shows the total number of submissions across all forms.
                    Select a specific form from the condition dropdown to track form-specific submissions.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          onClick={onClose}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowPreview(true)}
          icon={<Eye className="h-4 w-4" />}
        >
          Preview
        </Button>
        <Button
          onClick={handleSave}
          icon={<Filter className="h-4 w-4" />}
        >
          Apply Query
        </Button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <ReportPreview
          config={{
            name: queryName,
            description: queryDescription,
            selectedFields: Array.from(selectedFields),
            formSpecificCount: selectedFormForCount,
            countIfConditions
          }}
          onClose={() => setShowPreview(false)}
          onExport={() => {
            // Export logic here
          }}
        />
      )}
    </div>
  );
}