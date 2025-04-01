import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '../shared/Card';

type ChartProps = {
  data: any[];
  reportType: 'skills' | 'clinical' | 'combined';
};

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

export function ReportCharts({ data = [], reportType }: ChartProps) {
  // Calculate statistics for charts
  const stats = useMemo(() => {
    // Ensure data is an array
    const validData = Array.isArray(data) ? data : [];

    const byType = validData.reduce((acc: Record<string, number>, item) => {
      const type = item.type === 'skill' ? 'Lab Skills' : 'Clinical Documentation';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const byCategory = validData.reduce((acc: Record<string, number>, item) => {
      const category = item.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const byDate = validData.reduce((acc: Record<string, number>, item) => {
      const date = new Date(item.date).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return {
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
      byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
      byDate: Object.entries(byDate).map(([date, count]) => ({ date, count }))
    };
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Submissions Over Time */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Submissions Over Time</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{fontSize: 12}}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Distribution by Category */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Distribution by Category</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.byCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {stats.byCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="lg:col-span-2">
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-indigo-900">Total Submissions</h4>
              <p className="mt-2 text-2xl font-semibold text-indigo-600">{Array.isArray(data) ? data.length : 0}</p>
            </div>
            {reportType === 'combined' && (
              <>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900">Lab Skills</h4>
                  <p className="mt-2 text-2xl font-semibold text-green-600">
                    {Array.isArray(data) ? data.filter(item => item.type === 'skill').length : 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-900">Clinical Documentation</h4>
                  <p className="mt-2 text-2xl font-semibold text-purple-600">
                    {Array.isArray(data) ? data.filter(item => item.type === 'clinical').length : 0}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}