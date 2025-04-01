import { Bug } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '../hooks/useQuery';
import { PageLayout } from '../components/shared/PageLayout';
import { Card } from '../components/shared/Card';

export function Debug() {
  const { user } = useAuth();
  const { data: profile, loading: profileLoading, error: profileError } = useQuery('profiles', {
    select: '*',
    match: { id: user?.id },
    single: true
  });

  const { data: logs, loading: logsLoading, error: logsError } = useQuery('skill_logs', {
    select: `
      *,
      student:profiles!skill_logs_student_id_fkey (
        id,
        full_name,
        email
      ),
      evaluator:profiles!skill_logs_evaluated_student_id_fkey (
        id,
        full_name,
        email
      ),
      skill:skills (
        id,
        name,
        skill_categories (
          name
        )
      )
    `,
    match: { student_id: user?.id }
  });

  const { data: assignments, loading: assignmentsLoading, error: assignmentsError } = useQuery('skill_assignments', {
    select: `
      *,
      skill:skills (
        id,
        name,
        skill_categories (
          name
        )
      )
    `,
    match: { student_id: user?.id }
  });

  const loading = profileLoading || logsLoading || assignmentsLoading;
  const error = profileError || logsError || assignmentsError;

  return (
    <PageLayout
      title="Debug Information"
      description="View detailed information about your account and data"
      icon={Bug}
      loading={loading}
      error={error}
    >
      <div className="space-y-6">
        {/* Profile Information */}
        <Card title="Profile Data">
          <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </Card>

        {/* Skill Logs */}
        <Card title="Skill Logs">
          <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
            {JSON.stringify(logs, null, 2)}
          </pre>
        </Card>

        {/* Skill Assignments */}
        <Card title="Skill Assignments">
          <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
            {JSON.stringify(assignments, null, 2)}
          </pre>
        </Card>
      </div>
    </PageLayout>
  );
}