import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Preload from "./components/Preload";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import "./index.css";

function Root() {
  const [ready, setReady] = useState(false);
  const handleFinish = useCallback(() => setReady(true), []);

  return (
    <>
      {!ready && <Preload onFinish={handleFinish} />}
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
