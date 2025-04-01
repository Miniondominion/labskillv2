import { ReactNode } from 'react';

type Props = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  onClick?: () => void;
};

export function Card({ title, description, children, className = '', footer, onClick }: Props) {
  const cardClasses = `bg-white shadow rounded-lg overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${className}`;

  const content = (
    <>
      {(title || description) && (
        <div className="px-4 py-5 sm:px-6">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      <div className="px-4 py-5 sm:p-6">
        {children}
      </div>
      {footer && (
        <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </>
  );

  return onClick ? (
    <div onClick={onClick} className={cardClasses}>
      {content}
    </div>
  ) : (
    <div className={cardClasses}>
      {content}
    </div>
  );
}