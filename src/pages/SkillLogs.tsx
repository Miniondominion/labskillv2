import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Loader2, BookOpen, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../components/shared/Card';
import { StatusMessage } from '../components/shared/StatusMessage';

type SkillLog = {
  id: string;
  created_at: string;
  status: 'submitted' | 'rejected';
  attempt_number: number;
  evaluator_name: string;
  evaluator_type: 'peer' | 'instructor';
  responses: Record<string, any>;
  skill: {
    name: string;
    description: string;
    form_schema: {
      questions: {
        id: string;
        question_text: string;
        response_type: string;
        options?: string[];
      }[];
    };
    skill_categories: {
      name: string;
    };
  };
};

export function SkillLogs() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<SkillLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLogs();
  }, [user]);

  async function loadLogs() {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('skill_logs')
        .select(`
          id,
          created_at,
          status,
          attempt_number,
          evaluator_name,
          evaluator_type,
          responses,
          skill:skills (
            name,
            description,
            form_schema,
            skill_categories (
              name
            )
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error loading skill logs:', err);
      setError('Failed to load skill logs');
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'pending':
        return 'Incomplete';
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  const toggleLog = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skill Logs</h1>
            <p className="mt-1 text-sm text-gray-500">
              View your submitted skill logs and their status
            </p>
          </div>
        </div>

        {error && <StatusMessage type="error" message={error} />}

        {logs.length > 0 ? (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <div 
                  className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => toggleLog(log.id)}
                >
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      {log.skill.name}
                      <span className="ml-2 text-sm text-gray-500">
                        ({log.skill.skill_categories.name})
                      </span>
                    </h3>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Attempt #{log.attempt_number}</span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="capitalize">{log.evaluator_type} Verification</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.status === 'verified' 
                        ? 'bg-green-100 text-green-800'
                        : log.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getStatusText(log.status)}
                    </span>
                    {expandedLogs.has(log.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedLogs.has(log.id) && (
                  <div className="border-t border-gray-200 px-4 py-5">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      {log.skill.form_schema.questions.map((question) => (
                        <div key={question.id} className="bg-form-bg-50 p-4 rounded-lg">
                          <dt className="text-sm font-medium text-gray-700">
                            {question.question_text}
                          </dt>
                          <dd className="mt-2 text-sm text-gray-900">
                            {question.response_type === 'checkbox'
                              ? log.responses[question.id] ? 'Yes' : 'No'
                              : log.responses[question.id] || 'No response'}
                          </dd>
                        </div>
                      ))}
                      <div className="sm:col-span-2 bg-form-bg-50 p-4 rounded-lg">
                        <dt className="text-sm font-medium text-gray-700">
                          Evaluated By
                        </dt>
                        <dd className="mt-2 text-sm text-gray-900">
                          {log.evaluator_name}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No skill logs</h3>
              <p className="mt-1 text-sm text-gray-500">
                You haven't submitted any skill logs yet.
              </p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}