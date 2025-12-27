import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeSentry } from "./lib/sentry";
import { initializeColorScheme } from "./lib/colorScheme";

// Initialize color scheme before app renders
initializeColorScheme();

// Initialize Sentry in background (non-blocking)
initializeSentry().catch(console.error);

// Service Worker registration disabled until implementation is needed
// Re-enable when service-worker.js is created with proper caching strategy
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker
//       .register('/service-worker.js')
//       .then((registration) => {
//         console.log('✅ Service Worker registrado com sucesso:', registration);
//         
//         if ('pushManager' in registration) {
//           console.log('✅ Push Manager disponível para notificações');
//         }
//       })
//       .catch((error) => {
//         console.error('❌ Erro ao registrar Service Worker:', error);
//       });
//   });
// }

// Render immediately without waiting for Sentry
// Note: Temporarily without StrictMode to debug Suspense issues
createRoot(document.getElementById("root")!).render(<App />);
