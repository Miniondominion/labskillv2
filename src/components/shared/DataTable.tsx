import { ReactNode } from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { WithClassName } from '../../types/common';

export type Column<T> = {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
  className?: string;
  sortable?: boolean;
};

export type DataTableProps<T> = WithClassName<{
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  emptyState?: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
      icon?: LucideIcon;
    };
  };
  rowClassName?: string;
  onRowClick?: (item: T) => void;
  sortColumn?: keyof T;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: keyof T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}>;

export function DataTable<T extends Record<string, any>>({
  data: rawData,
  columns,
  loading = false,
  error = null,
  emptyState,
  rowClassName = '',
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  pagination,
  className = ''
}: DataTableProps<T>) {
  // Ensure data is an array
  const data = Array.isArray(rawData) ? rawData : [];

  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (data.length === 0 && emptyState) {
    return (
      <EmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
      />
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                } ${column.className || ''}`}
                onClick={() => {
                  if (column.sortable && typeof column.accessor === 'string') {
                    onSort?.(column.accessor);
                  }
                }}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.header}</span>
                  {column.sortable && typeof column.accessor === 'string' && sortColumn === column.accessor && (
                    <span className="ml-2">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick?.(item)}
              className={`${
                onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
              } ${rowClassName}`}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}
                >
                  {typeof column.accessor === 'function'
                    ? column.accessor(item)
                    : item[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => pagination.onPageChange(page)}
              className={`px-3 py-1 rounded ${
                page === pagination.currentPage
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}