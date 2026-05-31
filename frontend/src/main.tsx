import React from "react";
import ReactDOM from "react-dom/client";
import { initSentry } from "@/lib/sentry";
import "@/i18n"; // i18n must initialize before any component renders
import "@/index.css";
import App from "@/App";
import { BrandingProvider } from "@/lib/branding";

// Initialize Sentry before rendering (no-op if DSN not set)
initSentry();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <BrandingProvider>
      <App />
    </BrandingProvider>
  </React.StrictMode>,
);
