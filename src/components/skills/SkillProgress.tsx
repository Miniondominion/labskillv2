import { useState, useEffect } from 'react';
import { Clock, Bug, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '../../hooks/useQuery';
import { useBatchLoader } from '../../hooks/useBatchLoader';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { SkillAssignment, SkillLog } from '../../types/models';
import { Modal } from '../shared/Modal';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { ErrorMessage } from '../shared/ErrorMessage';
import { LoadingSpinner } from '../shared/LoadingSpinner';

type SkillProgress = {
  skill_id: string;
  skill_name: string;
  category_name: string;
  required_submissions: number;
  submission_count: number;
  due_date: string | null;
  status: 'pending' | 'completed' | 'expired';
};

type DebugInfo = {
  skill_assignments: SkillAssignment[];
  skill_logs: SkillLog[];
};

export function SkillProgress() {
  const { user } = useAuth();
  const { error, setError, handleApiError, clearError } = useErrorHandler();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch assignments with caching
  const { data: assignments, loading: assignmentsLoading } = useQuery('skill_assignments', {
    select: `
      id,
      skill_id,
      required_submissions,
      due_date,
      status,
      skills (
        id,
        name,
        skill_categories (
          name
        )
      )
    `,
    match: { student_id: user?.id },
    cache: true,
    ttl: 5 * 60 * 1000, // 5 minutes
    dependencies: [user?.id]
  });

  // Batch load skill logs
  const { data: logs, loading: logsLoading } = useBatchLoader<SkillLog>(
    'skill_logs',
    assignments?.map(a => a.skill_id) || [],
    'skill_id',
    '*',
    [assignments]
  );

  // Process assignments and logs into progress data
  const skillProgress = assignments?.map(assignment => {
    const submissions = logs?.filter(log => 
      log.skill_id === assignment.skill_id && 
      log.status === 'submitted'
    ).length || 0;

    return {
      skill_id: assignment.skill_id,
      skill_name: assignment.skills?.name || 'Unknown Skill',
      category_name: assignment.skills?.skill_categories?.name || 'Uncategorized',
      required_submissions: assignment.required_submissions,
      submission_count: submissions,
      due_date: assignment.due_date,
      status: assignment.status
    };
  }) || [];

  function getStatusText(status: string): string {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'expired':
        return 'Expired';
      default:
        return 'Incomplete';
    }
  }

  function getStatusVariant(status: string): 'green' | 'red' | 'yellow' {
    switch (status) {
      case 'completed':
        return 'green';
      case 'expired':
        return 'red';
      default:
        return 'yellow';
    }
  }

  function calculateProgressPercentage(submissionCount: number, requiredSubmissions: number): number {
    if (requiredSubmissions === 0) return 0;
    return Math.min((submissionCount / requiredSubmissions) * 100, 100);
  }

  if (assignmentsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center h-12">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (skillProgress.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <div 
          className="flex justify-between items-center cursor-pointer" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900">Skills Progress</h3>
            <p className="ml-2 text-sm text-gray-500">
              ({skillProgress.length} skill{skillProgress.length !== 1 ? 's' : ''})
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDebug(true);
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug Info
            </button>
            {isExpanded ? 
              <ChevronUp className="h-5 w-5 text-gray-400" /> : 
              <ChevronDown className="h-5 w-5 text-gray-400" />
            }
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 max-h-[360px] overflow-y-auto">
            {skillProgress.map((skill) => (
              <div key={skill.skill_id} className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{skill.skill_name}</h4>
                    <p className="text-sm text-gray-500">{skill.category_name}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {skill.due_date && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Due: {new Date(skill.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <Badge variant={getStatusVariant(skill.status)}>
                      {getStatusText(skill.status)}
                    </Badge>
                  </div>
                </div>
                
                <div className="relative pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-gray-600">
                        {skill.submission_count} of {skill.required_submissions} submissions
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-gray-600">
                        {Math.round(calculateProgressPercentage(skill.submission_count, skill.required_submissions))}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-gray-200">
                    <div
                      style={{ width: `${calculateProgressPercentage(skill.submission_count, skill.required_submissions)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                        skill.status === 'completed' ? 'bg-green-600' :
                        skill.status === 'expired' ? 'bg-red-600' :
                        'bg-yellow-600'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Debug Information Modal */}
      {showDebug && debugInfo && (
        <Modal
          title="Debug Information"
          onClose={() => setShowDebug(false)}
          size="xl"
        >
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">Skill Assignments</h4>
              <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                {JSON.stringify(debugInfo.skill_assignments, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">Skill Logs</h4>
              <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                {JSON.stringify(debugInfo.skill_logs, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}