import React, { useEffect, useState } from "react";
import {
  getSessions,
  deleteSession,
  exportCSV,
  exportJSON,
} from "../../utils/storage.js";

const SITES = ["all", "monkeytype"];

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");

  useEffect(() => {
    getSessions().then(setSessions);
  }, []);

  const filtered = sessions
    .filter((s) =>
      dateFrom ? new Date(s.createdAt) >= new Date(dateFrom) : true,
    )
    .filter((s) => (search ? String(s.wpm).includes(search) : true))
    .reverse();

  async function handleDelete(id) {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
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
    <div className="ff-history">
      <div className="ff-filters">
        <input
          className="ff-input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="ff-input"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
      </div>

      <div className="ff-export-row">
        <button className="ff-btn-sm" onClick={() => handleExport("csv")}>
          Export CSV
        </button>
        <button className="ff-btn-sm" onClick={() => handleExport("json")}>
          Export JSON
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="ff-empty">No sessions found.</p>
      ) : (
        <table className="ff-table">
          <thead>
            <tr>
              <th>WPM</th>
              <th>Raw</th>
              <th>Acc</th>
              <th>Mode</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.wpm}</td>
                <td>{s.rawWpm}</td>
                <td>{s.accuracy}%</td>
                <td>{s.mode}</td>
                <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="ff-btn-danger-sm"
                    onClick={() => handleDelete(s.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
