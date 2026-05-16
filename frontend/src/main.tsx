import React from "react";
import ReactDOM from "react-dom/client";
import { initSentry } from "@/lib/sentry";
import "@/index.css";
import App from "@/App";

// Initialize Sentry before rendering (no-op if DSN not set)
initSentry();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
