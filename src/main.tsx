
// import { registerSW } from 'virtual:pwa-register'
// // This automatically updates the app when you push new code
// registerSW({ immediate: true })
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);
  