import React, { useEffect, useRef, useState } from "react";
import {
  clearAllData,
  exportBackupJSON,
  exportCSV,
  exportJSON,
  getSessions,
  importBackupJSON,
} from "../utils/storage.js";

export default function Options() {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    getSessions().then((s) => setCount(s.length));
  }, []);

  async function handleClear() {
    if (!confirm("Delete ALL local data? This cannot be undone.")) return;
    await clearAllData();
    setCount(0);
    setStatus("All local data has been cleared.");
  }

  async function handleExport(format) {
    const content =
      format === "csv"
        ? await exportCSV()
        : format === "backup"
          ? await exportBackupJSON()
          : await exportJSON();
    const blob = new Blob([content], {
      type: format === "csv" ? "text/csv" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      format === "backup"
        ? "fast-finger-backup.json"
        : `fast-finger-sessions.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(
      format === "backup"
        ? "Backup exported successfully."
        : `Exported sessions as ${format.toUpperCase()}.`,
    );
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        "Importing will overwrite matching keys in existing data. Continue?",
      )
    ) {
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const result = await importBackupJSON(text);
      const sessions = await getSessions();
      setCount(sessions.length);

      const keySummary = result.importedKeys.join(", ");
      setStatus(
        `Import complete. Keys: ${keySummary}. Total sessions: ${sessions.length}.`,
      );
    } catch (error) {
      setStatus(error?.message || "Import failed. Please check your file.");
    } finally {
      event.target.value = "";
    }
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
          <button className="ff-btn" onClick={() => handleExport("backup")}>
            Export Full Backup
          </button>
          <button className="ff-btn" onClick={handleImportClick}>
            Import Data
          </button>
          <button
            className="ff-btn"
            style={{ background: "#e74c3c" }}
            onClick={handleClear}
          >
            Clear All Data
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={handleImportFile}
        />
        {status ? (
          <p style={{ color: "#888", marginTop: 12, lineHeight: 1.6 }}>
            {status}
          </p>
        ) : null}
      </section>

      <section>
        <h2 style={{ marginBottom: 10, fontSize: 14 }}>About</h2>
        <p style={{ color: "#888", lineHeight: 1.6 }}>
          Fast Finger v1.0.0 — Typing Progress Tracker
          <br />
          Supports Monkeytype
        </p>
      </section>
    </div>
  );
}
