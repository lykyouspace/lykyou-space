import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const HomeDashboard = lazy(() => import("./HomeDashboard"));
const SpacePages = lazy(() => import("./SpacePages"));

const authPaths = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

export default function App() {
  const { pathname } = useLocation();
  const page = authPaths.has(pathname)
    ? <AuthPage />
    : pathname === "/"
      ? <HomeDashboard />
      : <SpacePages />;

  return <Suspense fallback={<div className="app-loading" role="status">Opening your space…</div>}>{page}</Suspense>;
}
