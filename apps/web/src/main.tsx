import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./styles/global.css";
import "./styles/app.css";
import { syntheticRunId } from "./lib/api";
import DecisionWorkspace from "./routes/DecisionWorkspace";
import Compare from "./routes/Compare";
import Audit from "./routes/Audit";
import NotFoundRun from "./routes/NotFoundRun";

const router = createBrowserRouter([
  // `/` is a bootstrap route, not a fourth destination (01 §3.4).
  { path: "/", element: <Navigate to={`/runs/${syntheticRunId("A")}`} replace /> },
  { path: "/runs/:runId", element: <DecisionWorkspace /> },
  { path: "/runs/:runId/compare", element: <Compare /> },
  { path: "/runs/:runId/audit", element: <Audit /> },
  { path: "*", element: <NotFoundRun /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
