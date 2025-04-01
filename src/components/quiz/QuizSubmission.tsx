import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

type Option = {
  id: string;
  text: string;
};

type QuizSubmissionProps = {
  question: string;
  options: Option[];
  selectedOptions: string[];
  onChange: (selectedIds: string[]) => void;
  allowMultiple?: boolean;
  required?: boolean;
};

export function QuizSubmission({
  question,
  options,
  selectedOptions,
  onChange,
  allowMultiple = false,
  required = false,
}: QuizSubmissionProps) {
  const [focusedOption, setFocusedOption] = useState<string | null>(null);
  const optionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!focusedOption) return;

      const currentIndex = options.findIndex(opt => opt.id === focusedOption);
      let nextIndex: number;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % options.length;
          setFocusedOption(options[nextIndex].id);
          optionRefs.current.get(options[nextIndex].id)?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = (currentIndex - 1 + options.length) % options.length;
          setFocusedOption(options[nextIndex].id);
          optionRefs.current.get(options[nextIndex].id)?.focus();
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          handleOptionSelect(focusedOption);
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedOption, options]);

  const handleOptionSelect = (optionId: string) => {
    if (allowMultiple) {
      const newSelection = selectedOptions.includes(optionId)
        ? selectedOptions.filter(id => id !== optionId)
        : [...selectedOptions, optionId];
      onChange(newSelection);
    } else {
      onChange([optionId]);
    }
  };

  return (
    <div
      role="region"
      aria-label="Quiz question"
      className="w-full max-w-2xl mx-auto p-4 sm:p-6"
    >
      {/* Question */}
      <div className="mb-6">
        <h2 
          id="question-label" 
          className="text-lg sm:text-xl font-medium text-gray-900 mb-2"
        >
          {question}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </h2>
        <p className="text-sm text-gray-500">
          {allowMultiple ? 'Select all that apply' : 'Select one option'}
        </p>
      </div>

      {/* Options */}
      <div
        role={allowMultiple ? 'group' : 'radiogroup'}
        aria-labelledby="question-label"
        aria-required={required}
        className="space-y-4"
      >
        {options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          
          return (
            <div
              key={option.id}
              ref={el => {
                if (el) optionRefs.current.set(option.id, el);
              }}
              role={allowMultiple ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => handleOptionSelect(option.id)}
              onFocus={() => setFocusedOption(option.id)}
              onBlur={() => setFocusedOption(null)}
              className={`
                relative flex items-center p-4 sm:p-6
                border-2 rounded-lg cursor-pointer
                transition-all duration-200
                outline-none w-full
                ${isSelected 
                  ? 'border-indigo-500 bg-indigo-50 animate-scale-in' 
                  : 'border-form-border-200 hover:border-indigo-200 focus:border-indigo-300'}
                ${focusedOption === option.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
              `}
            >
              {/* Modern Selection Indicator */}
              <div 
                className={`
                  flex-shrink-0 mr-4
                  w-6 h-6
                  flex items-center justify-center
                  rounded-md
                  transition-all duration-200
                  ${isSelected 
                    ? 'bg-indigo-500 text-white shadow-sm animate-scale-in' 
                    : 'bg-white border-2 border-form-border-300'}
                `}
              >
                <Check 
                  className={`
                    h-4 w-4 
                    transition-all duration-200
                    ${isSelected 
                      ? 'opacity-100 transform scale-100' 
                      : 'opacity-0 transform scale-75'}
                  `} 
                />
              </div>

              {/* Option Text */}
              <div className="flex-grow text-base sm:text-lg text-gray-900">
                {option.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {required && selectedOptions.length === 0 && (
        <p 
          className="mt-2 text-sm text-red-600" 
          role="alert"
        >
          Please select an option
        </p>
      )}
    </div>
  );
}