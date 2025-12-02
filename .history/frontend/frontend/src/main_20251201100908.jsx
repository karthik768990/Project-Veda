// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css"; // your Tailwind + custom CSS (moved from static/style.css)

// optional global polyfills or providers can go here

const rootEl = document.getElementById("root") ?? document.createElement("div");
if (!document.getElementById("root")) {
  document.body.appendChild(rootEl);
  rootEl.id = "root";
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
