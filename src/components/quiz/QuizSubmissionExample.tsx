import { useState } from 'react';
import { QuizSubmission } from './QuizSubmission';

const sampleOptions = [
  { id: '1', text: 'The quick brown fox jumps over the lazy dog, demonstrating all letters of the alphabet in a single sentence.' },
  { id: '2', text: 'Pack my box with five dozen liquor jugs, showing another example of a pangram.' },
  { id: '3', text: 'How vexingly quick daft zebras jump, providing yet another example of using all letters.' },
  { id: '4', text: 'The five boxing wizards jump quickly, demonstrating brevity in pangrams.' },
];

export function QuizSubmissionExample() {
  const [singleSelection, setSingleSelection] = useState<string[]>([]);
  const [multiSelection, setMultiSelection] = useState<string[]>([]);

  return (
    <div className="space-y-12 p-4">
      {/* Single Selection Example */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Single Selection Quiz</h2>
        <QuizSubmission
          question="Which of the following is your favorite pangram?"
          options={sampleOptions}
          selectedOptions={singleSelection}
          onChange={setSingleSelection}
          required
        />
      </div>

      {/* Multiple Selection Example */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Multiple Selection Quiz</h2>
        <QuizSubmission
          question="Which pangrams use the word 'quick'?"
          options={sampleOptions}
          selectedOptions={multiSelection}
          onChange={setMultiSelection}
          allowMultiple
          required
        />
      </div>
    </div>
  );
}