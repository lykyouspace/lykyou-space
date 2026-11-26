import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const BetaPage = lazy(() => import("./pages/BetaPage"));
const BetaAdminPage = lazy(() => import("./pages/BetaAdminPage"));
const BetaHubPage = lazy(() => import("./pages/BetaHubPage"));
const BetaManagementPage = lazy(() => import("./pages/BetaManagementPage"));
const BetaExitSurveyPage = lazy(() => import("./pages/BetaExitSurveyPage"));
const SpacePages = lazy(() => import("./SpacePages"));

const authPaths = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

export default function App() {
  const { pathname } = useLocation();
  const page = pathname === "/beta"
    ? <BetaPage />
    : pathname === "/beta-zone"
      ? <BetaHubPage />
      : pathname === "/beta-exit-survey"
        ? <BetaExitSurveyPage />
      : pathname === "/admin/beta-testing"
        ? <BetaManagementPage />
      : pathname === "/admin/beta"
        ? <BetaAdminPage />
      : authPaths.has(pathname)
        ? <AuthPage />
        : <SpacePages />;

  return <Suspense fallback={<div className="app-loading" role="status">Opening your space…</div>}>{page}</Suspense>;
}
