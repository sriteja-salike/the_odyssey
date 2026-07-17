import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { InlineLoading, Theme } from "@carbon/react";
import "@carbon/styles/css/styles.css";
import "./styles/global.css";
import "./styles/app.css";
import { activeRun } from "./lib/liveApi";
const DecisionWorkspace = lazy(() => import("./routes/DecisionWorkspace"));
const Compare = lazy(() => import("./routes/Compare"));
const Audit = lazy(() => import("./routes/Audit"));
const NotFoundRun = lazy(() => import("./routes/NotFoundRun"));

const router = createBrowserRouter(
  [
    // `/` is a bootstrap route, not a fourth destination (01 §3.4).
    { path: "/", element: <Bootstrap /> },
    { path: "/runs/:runId", element: <DecisionWorkspace /> },
    { path: "/runs/:runId/compare", element: <Compare /> },
    { path: "/runs/:runId/audit", element: <Audit /> },
    { path: "*", element: <NotFoundRun /> },
  ],
  { future: { v7_relativeSplatPath: true } },
);

function Bootstrap() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    activeRun("A")
      .then((run) => navigate(`/runs/${run.run_id}`, { replace: true }))
      .catch((reason: Error) => setError(reason.message));
  }, [navigate]);
  return (
    <main className="bootstrap-screen">
      <div className="bootstrap-screen__mark" aria-hidden>NO</div>
      <div>
        <p className="eyebrow">NourishOps decision intelligence</p>
        <h1>Opening the operations workspace</h1>
        {error ? <p className="field__err">{error}</p> : <InlineLoading description="Connecting to verified synthetic sources…" />}
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme theme="white" className="root-theme">
      <Suspense fallback={<main className="bootstrap-screen"><InlineLoading description="Loading workspace…" /></main>}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </Suspense>
    </Theme>
  </React.StrictMode>
);
