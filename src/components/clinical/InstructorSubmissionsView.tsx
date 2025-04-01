import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, FileText, Eye } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { DynamicFormField } from './forms/DynamicFormField';

type ClinicalEntry = {
  id: string;
  student_id: string;
  clinical_type_id: string;
  form_id: string;
  shift_start: string;
  shift_end: string;
  preceptor_name: string;
  preceptor_credentials?: string;
  preceptor_email?: string;
  form_data: Record<string, any>;
  submitted_at: string;
  student: {
    full_name: string;
    email: string;
  };
  clinical_type: {
    name: string;
  };
  form: {
    name: string;
  };
};

type Props = {
  entries: ClinicalEntry[];
  formFields: Record<string, any[]>;
};

export function InstructorSubmissionsView({ entries, formFields }: Props) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<ClinicalEntry | null>(null);
  const [showEntryDetails, setShowEntryDetails] = useState(false);

  // Group entries by date
  const groupedEntries = entries.reduce((groups: Record<string, ClinicalEntry[]>, entry) => {
    const date = new Date(entry.shift_start).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {});

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleEntry = (entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const handleViewDetails = (entry: ClinicalEntry) => {
    setSelectedEntry(entry);
    setShowEntryDetails(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Clinical Documentation Submissions
          </h3>

          <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
            {Object.entries(groupedEntries).map(([date, dateEntries]) => (
              <Card key={date}>
                <div 
                  className="flex items-center justify-between cursor-pointer p-4"
                  onClick={() => toggleDate(date)}
                >
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">{date}</h4>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="blue">
                      {dateEntries.length} Submission{dateEntries.length !== 1 ? 's' : ''}
                    </Badge>
                    {expandedDates.has(date) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedDates.has(date) && (
                  <div className="border-t border-gray-200">
                    <div className="divide-y divide-gray-200">
                      {dateEntries.map((entry) => (
                        <div key={entry.id} className="p-4">
                          <div 
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => toggleEntry(entry.id)}
                          >
                            <div>
                              <div className="flex items-center">
                                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                                <h5 className="text-sm font-medium text-gray-900">
                                  {entry.student.full_name}
                                </h5>
                              </div>
                              <p className="mt-1 text-sm text-gray-500">
                                {entry.clinical_type.name} - {entry.form.name}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Eye className="h-4 w-4" />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(entry);
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>

                          {expandedEntries.has(entry.id) && (
                            <div className="mt-4 pl-7">
                              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-500">Shift Time</p>
                                    <p className="font-medium">
                                      {new Date(entry.shift_start).toLocaleTimeString()} - {' '}
                                      {new Date(entry.shift_end).toLocaleTimeString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Preceptor</p>
                                    <p className="font-medium">{entry.preceptor_name}</p>
                                  </div>
                                  {entry.preceptor_credentials && (
                                    <div>
                                      <p className="text-gray-500">Credentials</p>
                                      <p className="font-medium">{entry.preceptor_credentials}</p>
                                    </div>
                                  )}
                                  {entry.preceptor_email && (
                                    <div>
                                      <p className="text-gray-500">Email</p>
                                      <p className="font-medium">{entry.preceptor_email}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {Object.keys(groupedEntries).length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No clinical documentation has been submitted yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entry Details Modal */}
      {showEntryDetails && selectedEntry && (
        <Modal
          title="Clinical Documentation Details"
          onClose={() => {
            setShowEntryDetails(false);
            setSelectedEntry(null);
          }}
          size="xl"
        >
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900">Student Information</h4>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium">{selectedEntry.student.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium">{selectedEntry.student.email}</p>
                </div>
              </div>
            </div>

            {/* Shift Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900">Shift Information</h4>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">
                    {new Date(selectedEntry.shift_start).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Time</p>
                  <p className="font-medium">
                    {new Date(selectedEntry.shift_start).toLocaleTimeString()} - {' '}
                    {new Date(selectedEntry.shift_end).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Preceptor</p>
                  <p className="font-medium">{selectedEntry.preceptor_name}</p>
                </div>
                {selectedEntry.preceptor_credentials && (
                  <div>
                    <p className="text-gray-500">Credentials</p>
                    <p className="font-medium">{selectedEntry.preceptor_credentials}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Form Responses */}
            <div className="space-y-6">
              <h4 className="text-sm font-medium text-gray-900">Form Responses</h4>
              {formFields[selectedEntry.form_id]?.map((field: any) => (
                <DynamicFormField
                  key={field.id}
                  id={field.field_name}
                  label={field.field_label}
                  type={field.field_type}
                  required={field.required}
                  options={field.field_options}
                  content={field.field_content}
                  value={selectedEntry.form_data[field.field_name]}
                  onChange={() => {}} // Read-only
                />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}