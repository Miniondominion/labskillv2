import { useState } from 'react';
import { FormField } from '../shared/FormField';
import { Select } from '../shared/Select';
import { Button } from '../shared/Button';
import { Plus, Trash2, User } from 'lucide-react';

type DataSource = 'skills' | 'clinical' | 'user' | 'none';
type AggregationType = 'count' | 'sum' | 'average' | 'latest';

type FilterCondition = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

type Props = {
  onSave: (settings: {
    dataSource: DataSource;
    dataField: string;
    aggregation: AggregationType;
    filterConditions: FilterCondition[];
  }) => void;
  onClose: () => void;
  initialSettings?: {
    dataSource: DataSource;
    dataField: string;
    aggregation: AggregationType;
    filterConditions: FilterCondition[];
  };
};

export function FieldSettings({ onSave, onClose, initialSettings }: Props) {
  const [dataSource, setDataSource] = useState<DataSource>(initialSettings?.dataSource || 'none');
  const [dataField, setDataField] = useState(initialSettings?.dataField || '');
  const [aggregation, setAggregation] = useState<AggregationType>(initialSettings?.aggregation || 'count');
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>(
    initialSettings?.filterConditions || []
  );

  const dataFields = {
    skills: [
      { value: 'submission_count', label: 'Total Submissions' },
      { value: 'completed_count', label: 'Completed Skills' },
      { value: 'verified_count', label: 'Verified Skills' }
    ],
    clinical: [
      { value: 'total_hours', label: 'Total Hours' },
      { value: 'shift_count', label: 'Number of Shifts' },
      { value: 'patient_count', label: 'Total Patients' }
    ],
    user: [
      { value: 'full_name', label: 'Full Name' },
      { value: 'email', label: 'Email Address' },
      { value: 'role', label: 'User Role' },
      { value: 'created_at', label: 'Account Creation Date' }
    ],
    none: []
  };

  const addFilterCondition = () => {
    setFilterConditions([
      ...filterConditions,
      {
        id: crypto.randomUUID(),
        field: '',
        operator: 'equals',
        value: ''
      }
    ]);
  };

  const removeFilterCondition = (id: string) => {
    setFilterConditions(filterConditions.filter(condition => condition.id !== id));
  };

  const updateFilterCondition = (id: string, updates: Partial<FilterCondition>) => {
    setFilterConditions(
      filterConditions.map(condition =>
        condition.id === id ? { ...condition, ...updates } : condition
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      dataSource,
      dataField,
      aggregation,
      filterConditions
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormField
        label="Data Source"
        htmlFor="dataSource"
      >
        <Select
          value={dataSource}
          onChange={(value) => {
            setDataSource(value as DataSource);
            setDataField('');
          }}
          options={[
            { value: 'none', label: 'None' },
            { value: 'skills', label: 'Lab Skills' },
            { value: 'clinical', label: 'Clinical Documentation' },
            { value: 'user', label: 'User Profile' }
          ]}
        />
      </FormField>

      {dataSource !== 'none' && (
        <>
          <FormField
            label="Data Field"
            htmlFor="dataField"
          >
            <Select
              value={dataField}
              onChange={setDataField}
              options={[
                { value: '', label: 'Select a field...' },
                ...dataFields[dataSource]
              ]}
            />
          </FormField>

          {dataSource !== 'user' && (
            <FormField
              label="Aggregation"
              htmlFor="aggregation"
            >
              <Select
                value={aggregation}
                onChange={(value) => setAggregation(value as AggregationType)}
                options={[
                  { value: 'count', label: 'Count' },
                  { value: 'sum', label: 'Sum' },
                  { value: 'average', label: 'Average' },
                  { value: 'latest', label: 'Latest Value' }
                ]}
              />
            </FormField>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Filter Conditions</h4>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addFilterCondition}
                icon={<Plus className="h-4 w-4" />}
              >
                Add Condition
              </Button>
            </div>

            {filterConditions.map((condition) => (
              <div key={condition.id} className="flex items-center space-x-4">
                <Select
                  value={condition.field}
                  onChange={(value) => updateFilterCondition(condition.id, { field: value })}
                  options={[
                    { value: '', label: 'Select field...' },
                    ...dataFields[dataSource]
                  ]}
                  className="flex-1"
                />

                <Select
                  value={condition.operator}
                  onChange={(value) => updateFilterCondition(condition.id, { operator: value })}
                  options={[
                    { value: 'equals', label: 'Equals' },
                    { value: 'not_equals', label: 'Does Not Equal' },
                    { value: 'greater_than', label: 'Greater Than' },
                    { value: 'less_than', label: 'Less Than' },
                    { value: 'contains', label: 'Contains' }
                  ]}
                  className="flex-1"
                />

                <input
                  type="text"
                  value={condition.value}
                  onChange={(e) => updateFilterCondition(condition.id, { value: e.target.value })}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Value"
                />

                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removeFilterCondition(condition.id)}
                  icon={<Trash2 className="h-4 w-4" />}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button type="submit">
          Save Settings
        </Button>
      </div>
    </form>
  );
}