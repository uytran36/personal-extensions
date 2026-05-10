import React, { useEffect, useState } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState({ count: 0, longest: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      chrome.runtime.sendMessage({ type: "GET_STATS", range: "daily" }),
      chrome.runtime.sendMessage({ type: "GET_STREAK" }),
    ]).then(([s, st]) => {
      setStats(s);
      setStreak(st);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="ff-loading">Loading…</div>;

  const recent = stats?.sessions?.slice(-5).reverse() || [];

  return (
    <div className="ff-dashboard">
      {/* ── Streak banner ── */}
      <div className="ff-streak-banner">
        <span className="ff-streak-icon">🔥</span>
        <span className="ff-streak-count">{streak.count} day streak</span>
        <span className="ff-streak-best">Best: {streak.longest}</span>
      </div>

      {/* ── Today's stats ── */}
      <section className="ff-stat-grid">
        <StatCard label="Avg WPM" value={stats?.avgWpm ?? "—"} />
        <StatCard label="Peak WPM" value={stats?.peakWpm ?? "—"} />
        <StatCard
          label="Accuracy"
          value={stats?.avgAccuracy ? `${stats.avgAccuracy}%` : "—"}
        />
        <StatCard label="Tests today" value={stats?.testCount ?? 0} />
        <StatCard
          label="Consistency"
          value={
            stats?.consistencyScore != null
              ? `${stats.consistencyScore}/100`
              : "—"
          }
        />
      </section>

      {/* ── Recent sessions ── */}
      <section>
        <h2 className="ff-section-title">Recent Sessions</h2>
        {recent.length === 0 ? (
          <p className="ff-empty">No sessions yet. Go type!</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>WPM</th>
                <th>Acc</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s.id}>
                  <td>{s.wpm}</td>
                  <td>{s.accuracy}%</td>
                  <td>{new Date(s.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="ff-stat-card">
      <div className="ff-stat-value">{value}</div>
      <div className="ff-stat-label">{label}</div>
    </div>
  );
}
