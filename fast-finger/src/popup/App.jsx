import React, { useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import History from "./pages/History.jsx";
import Analytics from "./pages/Analytics.jsx";
import Goals from "./pages/Goals.jsx";
import "../assets/popup.css";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "history", label: "History" },
  { id: "analytics", label: "Analytics" },
  { id: "goals", label: "Goals" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="ff-app">
      <header className="ff-header">
        <span className="ff-logo">⌨ Fast Finger</span>
      </header>

      <nav className="ff-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`ff-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="ff-content">
        {tab === "dashboard" && <Dashboard />}
        {tab === "history" && <History />}
        {tab === "analytics" && <Analytics />}
        {tab === "goals" && <Goals />}
      </main>
    </div>
  );
}
