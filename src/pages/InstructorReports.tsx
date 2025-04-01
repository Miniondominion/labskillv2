import { DashboardLayout } from '../components/DashboardLayout';
import { FileText } from 'lucide-react';

export function InstructorReports() {
  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-4">
        <FileText className="h-16 w-16 text-indigo-400 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports Coming Soon</h1>
        <p className="text-lg text-gray-600 max-w-md">
          We're working on building a comprehensive reporting system for instructors. Check back soon!
        </p>
      </div>
    </DashboardLayout>
  );
}