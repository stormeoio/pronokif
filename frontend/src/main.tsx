import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — App.js is still untyped during the S2 progressive
//              migration. Will become App.tsx in Sprint 3.
import App from "@/App";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
