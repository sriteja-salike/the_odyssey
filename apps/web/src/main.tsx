import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { InlineLoading, Theme } from "@carbon/react";
import "@carbon/styles/css/styles.css";
import "./styles/global.css";
import "./styles/app.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/newsreader/600.css";
const Home = lazy(() => import("./routes/Home"));
const OperationsAssistant = lazy(() => import("./routes/OperationsAssistant"));
const DecisionWorkspace = lazy(() => import("./routes/DecisionWorkspace"));
const Compare = lazy(() => import("./routes/Compare"));
const Audit = lazy(() => import("./routes/Audit"));
const NotFoundRun = lazy(() => import("./routes/NotFoundRun"));

const router = createBrowserRouter(
  [
    { path: "/", element: <Home /> },
    { path: "/assistant", element: <OperationsAssistant /> },
    { path: "/runs/:runId", element: <DecisionWorkspace /> },
    { path: "/runs/:runId/compare", element: <Compare /> },
    { path: "/runs/:runId/audit", element: <Audit /> },
    { path: "*", element: <NotFoundRun /> },
  ],
  { future: { v7_relativeSplatPath: true } },
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme theme="white" className="root-theme">
      <Suspense fallback={<main className="bootstrap-screen"><InlineLoading description="Loading workspace…" /></main>}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </Suspense>
    </Theme>
  </React.StrictMode>
);
