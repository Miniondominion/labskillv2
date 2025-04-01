import { AlertCircle, CheckCircle } from 'lucide-react';

type Props = {
  type: 'error' | 'success';
  message: string;
};

export function StatusMessage({ type, message }: Props) {
  if (!message) return null;

  const config = {
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      iconColor: 'text-red-400',
      Icon: AlertCircle
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-400',
      Icon: CheckCircle
    }
  }[type];

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-md p-4`}>
      <div className="flex">
        <config.Icon className={`h-5 w-5 ${config.iconColor}`} />
        <div className="ml-3">
          <p className={`text-sm ${config.textColor}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}