import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function PageHeader({ title, description, icon: Icon, action }: Props) {
  return (
    <div className="sm:flex sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          {Icon && <Icon className="h-6 w-6 mr-2 text-indigo-600" />}
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && (
        <div className="mt-4 sm:mt-0">
          {action}
        </div>
      )}
    </div>
  );
}