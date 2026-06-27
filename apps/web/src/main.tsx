import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { RootApp } from "./app/RootApp";

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <RootApp />
    </StrictMode>
  );
}
