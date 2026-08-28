import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ConfigError from "./components/ConfigError";
import { CONFIG_ERROR } from "./lib/api";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  CONFIG_ERROR ? (
    <ConfigError message={CONFIG_ERROR} />
  ) : (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
);
