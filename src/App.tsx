import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ClinicalProvider } from './contexts/ClinicalContext';
import { AuthGuard } from './components/AuthGuard';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { ResetPassword } from './pages/ResetPassword';
import { InstructorSelection } from './pages/InstructorSelection';
import { Dashboard } from './pages/Dashboard';
import { AdminStudentManagement } from './pages/AdminStudentManagement';
import { InstructorStudentManagement } from './pages/InstructorStudentManagement';
import { SkillsManagement } from './pages/SkillsManagement';
import { ClassManagement } from './pages/ClassManagement';
import { SkillAssignment } from './pages/SkillAssignment';
import { SkillLog } from './pages/SkillLog';
import { SkillLogs } from './pages/SkillLogs';
import { Profile } from './pages/Profile';
import { ReportsPage } from './pages/Reports';
import { QueryBuilderPage } from './pages/QueryBuilder';
import { ClinicalDocumentation } from './pages/ClinicalDocumentation';
import { AdminClinicalDocumentation } from './pages/AdminClinicalDocumentation';
import { PortfolioBuilder } from './pages/PortfolioBuilder';
import { PortfolioTemplateEditor } from './pages/PortfolioTemplateEditor';
import { SectionEditorPage } from './pages/SectionEditorPage';
import { PortfolioList } from './pages/PortfolioList';
import { PortfolioEditor } from './pages/PortfolioEditor';
import { PortfolioViewer } from './pages/PortfolioViewer';
import { InstructorReports } from './pages/InstructorReports';
import { AdminReports } from './pages/AdminReports';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ClinicalProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signup/instructor" element={<InstructorSelection />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/students"
              element={
                <AuthGuard>
                  <AdminStudentManagement />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/clinical-documentation"
              element={
                <AuthGuard>
                  <AdminClinicalDocumentation />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/portfolio-builder"
              element={
                <AuthGuard>
                  <PortfolioBuilder />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/portfolio-builder/template/:templateId"
              element={
                <AuthGuard>
                  <PortfolioTemplateEditor />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/portfolio-builder/template/:templateId/section/:sectionId"
              element={
                <AuthGuard>
                  <SectionEditorPage />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AuthGuard>
                  <AdminReports />
                </AuthGuard>
              }
            />
            <Route
              path="/instructor/reports"
              element={
                <AuthGuard>
                  <InstructorReports />
                </AuthGuard>
              }
            />
            <Route
              path="/instructor/students"
              element={
                <AuthGuard>
                  <InstructorStudentManagement />
                </AuthGuard>
              }
            />
            <Route
              path="/skills"
              element={
                <AuthGuard>
                  <SkillsManagement />
                </AuthGuard>
              }
            />
            <Route
              path="/skills/:skillId/assign"
              element={
                <AuthGuard>
                  <SkillAssignment />
                </AuthGuard>
              }
            />
            <Route
              path="/skills/log"
              element={
                <AuthGuard>
                  <SkillLog />
                </AuthGuard>
              }
            />
            <Route
              path="/skills/logs"
              element={
                <AuthGuard>
                  <SkillLogs />
                </AuthGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <AuthGuard>
                  <ReportsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/reports/query-builder"
              element={
                <AuthGuard>
                  <QueryBuilderPage />
                </AuthGuard>
              }
            />
            <Route
              path="/classes"
              element={
                <AuthGuard>
                  <ClassManagement />
                </AuthGuard>
              }
            />
            <Route
              path="/clinical-documentation"
              element={
                <AuthGuard>
                  <ClinicalDocumentation />
                </AuthGuard>
              }
            />
            <Route
              path="/portfolio"
              element={
                <AuthGuard>
                  <PortfolioList />
                </AuthGuard>
              }
            />
            <Route
              path="/portfolio/edit/:instanceId"
              element={
                <AuthGuard>
                  <PortfolioEditor />
                </AuthGuard>
              }
            />
            <Route
              path="/portfolio/view/:instanceId"
              element={
                <AuthGuard>
                  <PortfolioViewer />
                </AuthGuard>
              }
            />
            <Route
              path="/profile"
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ClinicalProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;