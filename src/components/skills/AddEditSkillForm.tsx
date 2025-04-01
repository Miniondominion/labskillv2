import { X, Plus, Upload } from 'lucide-react';
import { Skill, Category, Question } from '../../types/skills';
import { QuestionForm } from './QuestionForm';
import { ImportSkillsModal } from './ImportSkillsModal';
import { useState } from 'react';

type Props = {
  editingSkill: Skill | null;
  categories: Category[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  skill: {
    name: string;
    description: string;
    category_id: string;
    form_schema: {
      questions: Question[];
    };
  };
  onSkillChange: (updates: any) => void;
  onAddCategory?: () => void;
};

export function AddEditSkillForm({
  editingSkill,
  categories,
  onSubmit,
  onClose,
  skill,
  onSkillChange,
  onAddCategory,
}: Props) {
  const [showImportModal, setShowImportModal] = useState(false);

  function handleQuestionUpdate(index: number, updates: Partial<Question>) {
    const updatedQuestions = [...(skill.form_schema?.questions || [])];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    onSkillChange({
      ...skill,
      form_schema: {
        questions: updatedQuestions
      }
    });
  }

  function handleQuestionRemove(index: number) {
    onSkillChange({
      ...skill,
      form_schema: {
        questions: (skill.form_schema?.questions || []).filter((_, i) => i !== index)
      }
    });
  }

  function handleAddOption(index: number) {
    const updatedQuestions = [...(skill.form_schema?.questions || [])];
    const question = updatedQuestions[index];
    question.options = [...(question.options || []), ''];
    onSkillChange({
      ...skill,
      form_schema: {
        questions: updatedQuestions
      }
    });
  }

  function handleUpdateOption(questionIndex: number, optionIndex: number, value: string) {
    const updatedQuestions = [...(skill.form_schema?.questions || [])];
    const question = updatedQuestions[questionIndex];
    if (question.options) {
      question.options[optionIndex] = value;
      onSkillChange({
        ...skill,
        form_schema: {
          questions: updatedQuestions
        }
      });
    }
  }

  function handleRemoveOption(questionIndex: number, optionIndex: number) {
    const updatedQuestions = [...(skill.form_schema?.questions || [])];
    const question = updatedQuestions[questionIndex];
    if (question.options) {
      question.options = question.options.filter((_, i) => i !== optionIndex);
      onSkillChange({
        ...skill,
        form_schema: {
          questions: updatedQuestions
        }
      });
    }
  }

  function addQuestion() {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      question_text: '',
      response_type: 'text',
      is_required: true,
      order_index: (skill.form_schema?.questions || []).length,
      options: []
    };
    onSkillChange({
      ...skill,
      form_schema: {
        questions: [...(skill.form_schema?.questions || []), newQuestion]
      }
    });
  }

  function handleImportQuestions(questions: Question[]) {
    // Combine existing questions with imported ones
    onSkillChange({
      ...skill,
      form_schema: {
        questions: [...(skill.form_schema?.questions || []), ...questions]
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {editingSkill ? 'Edit Skill' : 'Add New Skill'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="skillName" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="skillName"
                value={skill.name}
                onChange={(e) => onSkillChange({ ...skill, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="skillCategory" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <div className="mt-1 flex space-x-2">
                <select
                  id="skillCategory"
                  value={skill.category_id}
                  onChange={(e) => onSkillChange({ ...skill, category_id: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {onAddCategory && (
                  <button
                    type="button"
                    onClick={onAddCategory}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="skillDescription" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="skillDescription"
              value={skill.description}
              onChange={(e) => onSkillChange({ ...skill, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Form Builder */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Verification Form</h3>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Questions
              </button>
            </div>
            <div className="space-y-4">
              {(skill.form_schema?.questions || []).map((question, index) => (
                <QuestionForm
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={handleQuestionUpdate}
                  onRemove={handleQuestionRemove}
                  onAddOption={handleAddOption}
                  onUpdateOption={handleUpdateOption}
                  onRemoveOption={handleRemoveOption}
                />
              ))}

              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {editingSkill ? 'Update Skill' : 'Add Skill'}
            </button>
          </div>
        </form>

        {showImportModal && (
          <ImportSkillsModal 
            onClose={() => setShowImportModal(false)}
            onImport={handleImportQuestions}
          />
        )}
      </div>
    </div>
  );
}