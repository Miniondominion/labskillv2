import { Eye, X } from 'lucide-react';
import { useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

type Question = {
  id: string;
  question_text: string;
  response_type: 'checkbox' | 'text' | 'number' | 'multiple_choice';
  is_required: boolean;
  order_index: number;
  options?: string[];
};

type FormPreviewProps = {
  questions: Question[];
  onClose: () => void;
};

export function FormPreview({ questions, onClose }: FormPreviewProps) {
  const [verificationType, setVerificationType] = useState<'peer' | 'instructor'>('peer');
  const [evaluatorName, setEvaluatorName] = useState('');

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Eye className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Form Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Verification Type Toggle */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Type <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="peer"
                  checked={verificationType === 'peer'}
                  onChange={(e) => setVerificationType(e.target.value as 'peer' | 'instructor')}
                  className="border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-700">Peer Verification</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="instructor"
                  checked={verificationType === 'instructor'}
                  onChange={(e) => setVerificationType(e.target.value as 'peer' | 'instructor')}
                  className="border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-700">Instructor Verification</span>
              </label>
            </div>
          </div>

          {/* Evaluator Name Field */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {verificationType === 'peer' ? 'Peer Evaluator Name' : 'Instructor Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
              placeholder={verificationType === 'instructor' ? "Instructor's name" : "Peer evaluator's name"}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          {/* Form Questions */}
          {questions.map((question) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {question.question_text}
                {question.is_required && <span className="text-red-500">*</span>}
              </label>

              {question.response_type === 'text' && (
                <input
                  type="text"
                  disabled
                  placeholder="Enter your answer"
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              )}

              {question.response_type === 'number' && (
                <input
                  type="number"
                  disabled
                  placeholder="Enter a number"
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              )}

              {question.response_type === 'checkbox' && (
                <div className="mt-1">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      disabled
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-700">Yes</span>
                  </label>
                </div>
              )}

              {question.response_type === 'multiple_choice' && (
                <div className="mt-2 space-y-2">
                  {question.options?.map((option, index) => (
                    <label key={index} className="inline-flex items-center block">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        disabled
                        className="border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-offset-0"
                      />
                      <span className="ml-2 text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Signature Panel - Only shown for instructor verification */}
          {verificationType === 'instructor' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructor Signature <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 block w-full h-32 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                <span className="text-sm text-gray-500">Signature area will appear here</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}