import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./App.css";

// Auto-aktualizacja PWA: gdy nowy service worker przejmie kontrolę, karta
// przeładowuje się sama — bez tego otwarte karty zostawały na starym bundle'u.
registerSW({ immediate: true });

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </React.StrictMode>
);
