import { ReactNode } from 'react';

type Tab = {
  id: string;
  label: string;
  count?: number;
};

type Props = {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  children?: ReactNode;
};

export function Tabs({ tabs, activeTab, onChange, children }: Props) {
  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } w-full py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-900'
                } py-0.5 px-2.5 rounded-full text-xs font-medium`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}