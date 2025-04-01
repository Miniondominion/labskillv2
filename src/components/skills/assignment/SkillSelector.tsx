import { Skill } from '../../../types/skills';
import { BookOpen } from 'lucide-react';
import { Select } from '../../shared/Select';
import { Card } from '../../shared/Card';

type Props = {
  skills: Skill[];
  selectedSkill: Skill | null;
  onSkillChange: (skill: Skill | null) => void;
};

export function SkillSelector({ skills, selectedSkill, onSkillChange }: Props) {
  return (
    <Card>
      <div className="space-y-4">
        <Select
          label="Select Skill to Assign"
          value={selectedSkill?.id || ''}
          onChange={(value) => {
            const skill = skills.find(s => s.id === value);
            onSkillChange(skill || null);
          }}
          options={[
            { value: '', label: 'Choose a skill...' },
            ...skills.map(skill => ({
              value: skill.id,
              label: `${skill.name} (${skill.skill_categories.name})`
            }))
          ]}
        />

        {selectedSkill && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
            <div className="flex">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-indigo-800">
                  {selectedSkill.name}
                </h3>
                <p className="mt-1 text-sm text-indigo-700">
                  {selectedSkill.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}