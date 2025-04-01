import { Plus, X } from 'lucide-react';

type Props = {
  options: string[];
  onChange: (options: string[]) => void;
  maxOptions?: number;
};

export function OptionBubbles({ options, onChange, maxOptions }: Props) {
  const addOption = () => {
    if (maxOptions && options.length >= maxOptions) return;
    onChange([...options, '']);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onChange(newOptions);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange(newOptions);
  };

  return (
    <div className="space-y-3">
      {options.map((option, index) => (
        <div 
          key={index}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder={`Option ${index + 1}`}
          />
          <button
            type="button"
            onClick={() => removeOption(index)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      
      {(!maxOptions || options.length < maxOptions) && (
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Option
        </button>
      )}
    </div>
  );
}