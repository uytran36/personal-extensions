import React, { useEffect, useState } from "react";
import { exportCSV, exportJSON, getSessions } from "../utils/storage.js";

export default function Options() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    getSessions().then((s) => setCount(s.length));
  }, []);

  async function handleClear() {
    if (!confirm("Delete ALL session history? This cannot be undone.")) return;
    await chrome.storage.local.remove("sessions");
    setCount(0);
  }

  async function handleExport(format) {
    const content = format === "csv" ? await exportCSV() : await exportJSON();
    const blob = new Blob([content], {
      type: format === "csv" ? "text/csv" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fast-finger-sessions.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ color: "#e0e0f0", fontFamily: "system-ui", padding: 20 }}>
      <h1 style={{ color: "#a48cf4", marginBottom: 20 }}>
        ⌨ Fast Finger – Settings
      </h1>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 10, fontSize: 14 }}>Data Management</h2>
        <p style={{ color: "#888", marginBottom: 12 }}>
          Total sessions stored:{" "}
          <strong style={{ color: "#fff" }}>{count}</strong>
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="ff-btn" onClick={() => handleExport("json")}>
            Export JSON
          </button>
          <button className="ff-btn" onClick={() => handleExport("csv")}>
            Export CSV
          </button>
          <button
            className="ff-btn"
            style={{ background: "#e74c3c" }}
            onClick={handleClear}
          >
            Clear All Data
          </button>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 10, fontSize: 14 }}>About</h2>
        <p style={{ color: "#888", lineHeight: 1.6 }}>
          Fast Finger v1.0.0 — Typing Progress Tracker
          <br />
          Supports Monkeytype, Keybr, 10FastFingers
        </p>
      </section>
    </div>
  );
}
