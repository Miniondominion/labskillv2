import { X } from 'lucide-react';
import { Category, Subcategory } from '../../types/skills';
import { useState } from 'react';

type Props = {
  newCategory: {
    name: string;
    description: string;
    subcategories: {
      name: string;
      description: string;
    }[];
  };
  setNewCategory: (category: {
    name: string;
    description: string;
    subcategories: {
      name: string;
      description: string;
    }[];
  }) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
};

export function AddCategoryForm({
  newCategory,
  setNewCategory,
  onSubmit,
  onClose,
}: Props) {
  const [showSubcategories, setShowSubcategories] = useState(false);

  const addSubcategory = () => {
    setNewCategory({
      ...newCategory,
      subcategories: [
        ...newCategory.subcategories,
        { name: '', description: '' }
      ]
    });
  };

  const updateSubcategory = (index: number, updates: Partial<{ name: string; description: string }>) => {
    const updatedSubcategories = [...newCategory.subcategories];
    updatedSubcategories[index] = {
      ...updatedSubcategories[index],
      ...updates
    };
    setNewCategory({
      ...newCategory,
      subcategories: updatedSubcategories
    });
  };

  const removeSubcategory = (index: number) => {
    setNewCategory({
      ...newCategory,
      subcategories: newCategory.subcategories.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add New Category</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="categoryName"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="categoryDescription" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="categoryDescription"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowSubcategories(!showSubcategories)}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              {showSubcategories ? 'Hide Subcategories' : 'Add Subcategories'}
            </button>

            {showSubcategories && (
              <div className="mt-4 space-y-4">
                {newCategory.subcategories.map((subcategory, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium text-gray-900">Subcategory {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeSubcategory(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        value={subcategory.name}
                        onChange={(e) => updateSubcategory(index, { name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={subcategory.description}
                        onChange={(e) => updateSubcategory(index, { description: e.target.value })}
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSubcategory}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Another Subcategory
                </button>
              </div>
            )}
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
              Add Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}