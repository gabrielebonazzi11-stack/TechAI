import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import UpdateChecker from "./UpdateChecker";
import "./enhancers/pdfDrawingUploadEnhancer";
import "./utils/globalNumberFallback";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <UpdateChecker />
  </React.StrictMode>
);