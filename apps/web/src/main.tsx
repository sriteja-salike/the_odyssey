import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
    <main className="main">
      <div className="stack" style={{ maxWidth: 620 }}>
        <h1 className="risk-title">Opening the Scenario A simulation…</h1>
        {error ? <p className="field__err">{error}</p> : <p className="hint">Connecting to the seeded source systems.</p>}
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<main className="main"><p className="hint">Loading workspace…</p></main>}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </Suspense>
  </React.StrictMode>
);
