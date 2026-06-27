import { createRoot } from "react-dom/client";
import "../styles.css";
import { RecoveredAdminApp } from "./RecoveredAdminApp";

// Future non-live admin entry draft. Keep unused until the generated runtime is retired.
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<RecoveredAdminApp />);
