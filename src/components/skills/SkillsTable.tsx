import { Eye, Pencil, Trash2, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { Skill } from '../../types/skills';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { DataTable } from '../shared/DataTable';
import { Button } from '../shared/Button';

type Props = {
  skills: Skill[];
  onEdit?: (skill: Skill) => void;
  onDelete?: (skillId: string) => Promise<void>;
  onPreview: (skill: Skill) => void;
  userRole?: 'admin' | 'instructor';
};

export function SkillsTable({
  skills,
  onEdit,
  onDelete,
  onPreview,
  userRole,
}: Props) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const handleSkillClick = (skill: Skill) => {
    if (userRole === 'instructor') {
      navigate(`/skills/${skill.id}/assign`);
    }
  };

  const displayedSkills = showAll ? skills : skills.slice(0, 5);

  const columns = [
    {
      header: 'Name',
      accessor: (skill: Skill) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{skill.name}</div>
          <div className="text-sm text-gray-500 line-clamp-2">{skill.description}</div>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: (skill: Skill) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          {skill.skill_categories.name}
        </span>
      )
    },
    {
      header: 'Questions',
      accessor: (skill: Skill) => (
        <div>
          <div className="text-sm text-gray-900">
            {skill.form_schema?.questions.length || 0} questions
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(skill);
            }}
            className="mt-1 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900 transition-colors"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview Form
          </button>
        </div>
      )
    },
    {
      header: '',
      accessor: (skill: Skill) => (
        <div className="flex justify-end space-x-3">
          {userRole === 'admin' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={<Pencil className="h-4 w-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(skill);
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(skill.id);
                }}
              >
                Delete
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<UserPlus className="h-4 w-4" />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/skills/${skill.id}/assign`);
              }}
            >
              Assign
            </Button>
          )}
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <div className="flex flex-col">
      <DataTable
        data={displayedSkills}
        columns={columns}
        onRowClick={handleSkillClick}
        emptyState={{
          icon: Eye,
          title: "No skills available",
          description: "No skills have been created yet"
        }}
      />

      {/* Show More/Less Button */}
      {skills.length > 5 && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            onClick={() => setShowAll(!showAll)}
            icon={showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          >
            {showAll ? 'Show Less' : `Show All (${skills.length} skills)`}
          </Button>
        </div>
      )}
    </div>
  );
}