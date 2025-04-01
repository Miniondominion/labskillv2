import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action, children }: Props) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button
            onClick={action.onClick}
            icon={action.icon && <action.icon className="h-4 w-4" />}
          >
            {action.label}
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}