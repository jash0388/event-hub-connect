import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (typeof window !== "undefined" && !(window as any).puter) {
  const bridgeScript = document.createElement("script");
  bridgeScript.src = "/datanauts-bridge.js";
  document.head.appendChild(bridgeScript);
}

createRoot(document.getElementById("root")!).render(<App />);
