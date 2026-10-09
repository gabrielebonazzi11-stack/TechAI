import React from "react";
import ReactDOM from "react-dom/client";
import { shouldShowResetPasswordScreen } from "./lib/passwordRecovery";
import App from "./App.tsx";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import UpdateChecker from "./UpdateChecker";
import "./enhancers/pdfDrawingUploadEnhancer";
import "./utils/globalNumberFallback";

// /reset-password (o un link di recupero atterrato sul sito) mostra solo la
// schermata dedicata: l'app principale e il suo pannello di login non vengono
// montati, così nessun redirect automatico intercetta il flusso di recupero.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {shouldShowResetPasswordScreen ? <ResetPasswordPage /> : <App />}
    <UpdateChecker />
  </React.StrictMode>
);
