import { X } from 'lucide-react';
import { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  zIndex?: number;
  footer?: ReactNode;
};

export function Modal({ title, children, onClose, size = 'md', zIndex = 50, footer }: Props) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-[75%]'
  }[size];

  return (
    <div 
      className={`fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-${zIndex}`}
    >
      <div className={`bg-white rounded-lg w-full ${maxWidthClass} flex flex-col max-h-[90vh]`}>
        {/* Header - fixed */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer - fixed */}
        {footer && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}