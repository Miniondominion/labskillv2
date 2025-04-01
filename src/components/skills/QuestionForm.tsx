import { Plus, Minus, Trash2 } from 'lucide-react';
import { Question } from '../../types/skills';

type Props = {
  question: Question;
  index: number;
  onUpdate: (index: number, updates: Partial<Question>) => void;
  onRemove: (index: number) => void;
  onAddOption: (index: number) => void;
  onUpdateOption: (questionIndex: number, optionIndex: number, value: string) => void;
  onRemoveOption: (questionIndex: number, optionIndex: number) => void;
};

export function QuestionForm({
  question,
  index,
  onUpdate,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex-grow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Question Text
            </label>
            <input
              type="text"
              value={question.question_text}
              onChange={(e) => onUpdate(index, { question_text: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Response Type
              </label>
              <select
                value={question.response_type}
                onChange={(e) => onUpdate(index, { 
                  response_type: e.target.value as Question['response_type'],
                  options: (e.target.value === 'multiple_choice' || e.target.value === 'select_multiple') ? [''] : undefined
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="checkbox">Checkbox</option>
                <option value="multiple_choice">Multiple Choice (Single Answer)</option>
                <option value="select_multiple">Select All That Apply</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Required
              </label>
              <select
                value={question.is_required ? 'true' : 'false'}
                onChange={(e) => onUpdate(index, { is_required: e.target.value === 'true' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          {(question.response_type === 'multiple_choice' || question.response_type === 'select_multiple') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Options
              </label>
              {question.options?.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => onUpdateOption(index, optionIndex, e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveOption(index, optionIndex)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddOption(index)}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-700 ml-4"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}