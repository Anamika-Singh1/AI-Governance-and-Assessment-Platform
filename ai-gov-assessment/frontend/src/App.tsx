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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/new-assessment" element={<NewAssessmentPage />} />
      <Route path="/assessments/:id" element={<AssessmentResultsPage />} />
      <Route path="/use-cases/:id" element={<UseCaseDetailsPage />} />
      <Route path="/findings" element={<FindingsPage />} />
      <Route path="/sources" element={<SourcesPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/methodology" element={<MethodologyPage />} />
      <Route path="/governance-rules" element={<GovernanceRulesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
