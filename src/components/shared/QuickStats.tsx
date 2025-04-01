import { LucideIcon } from 'lucide-react';

type Stat = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
};

type Props = {
  stats: Stat[];
};

export function QuickStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className={`h-6 w-6 ${stat.iconColor || 'text-indigo-600'}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.label}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}