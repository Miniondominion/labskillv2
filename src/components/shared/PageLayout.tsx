import { ReactNode } from 'react';
import { DashboardLayout } from '../DashboardLayout';
import { PageHeader } from './PageHeader';
import { LoadingSpinner } from './LoadingSpinner';
import { StatusMessage } from './StatusMessage';
import { DivideIcon as LucideIcon } from 'lucide-react';

type Props = {
  children: ReactNode;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
};

export function PageLayout({
  children,
  title,
  description,
  icon,
  action,
  loading = false,
  error = null,
  success = null
}: Props) {
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={description}
          icon={icon}
          action={action}
        />

        {error && <StatusMessage type="error" message={error} />}
        {success && <StatusMessage type="success" message={success} />}

        {children}
      </div>
    </DashboardLayout>
  );
}