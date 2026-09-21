import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardPage } from "@/pages/DashboardPage";
import { NewAssessmentPage } from "@/pages/NewAssessmentPage";
import { AssessmentResultsPage } from "@/pages/AssessmentResultsPage";
import { UseCaseDetailsPage } from "@/pages/UseCaseDetailsPage";
import { FindingsPage } from "@/pages/FindingsPage";
import { SourcesPage } from "@/pages/SourcesPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { MethodologyPage } from "@/pages/MethodologyPage";
import { GovernanceRulesPage } from "@/pages/GovernanceRulesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AuthPage } from "@/pages/AuthPage";
import { useAuth } from "@/lib/auth";

function ProtectedApp(){
  const {user,loading}=useAuth();
  if(loading)return <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-500 dark:text-slate-400">Checking secure session…</div>;
  if(!user)return <Navigate to="/login" replace/>;
  return <Routes>
    <Route path="/" element={<DashboardPage />} /><Route path="/new-assessment" element={<NewAssessmentPage />} /><Route path="/assessments/:id" element={<AssessmentResultsPage />} /><Route path="/use-cases/:id" element={<UseCaseDetailsPage />} /><Route path="/findings" element={<FindingsPage />} /><Route path="/sources" element={<SourcesPage />} /><Route path="/history" element={<HistoryPage />} /><Route path="/methodology" element={<MethodologyPage />} /><Route path="/governance-rules" element={<GovernanceRulesPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() {
  return <Routes><Route path="/login" element={<AuthPage/>}/><Route path="*" element={<ProtectedApp/>}/></Routes>;
}
