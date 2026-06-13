import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WaitlistApp from "./WaitlistApp";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WaitlistApp />
  </StrictMode>,
);
