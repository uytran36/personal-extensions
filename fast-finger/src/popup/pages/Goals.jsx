import React, { useEffect, useState } from "react";
import {
  getGoals,
  saveGoals,
  getStats,
  getAchievements,
  getXP,
  getWeeklyMilestones,
  xpToLevel,
  xpForCurrentLevel,
  xpForNextLevel,
  ACHIEVEMENTS_CATALOG,
} from "../../utils/storage.js";

export default function Goals() {
  const [goals, setGoals] = useState({
    wpm: 80,
    accuracy: 97,
    tests: 10,
    minutes: 30,
  });
  const [stats, setStats] = useState(null);
  const [saved, setSaved] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [totalXP, setTotalXP] = useState(0);
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    Promise.all([
      getGoals(),
      getStats("daily"),
      getAchievements(),
      getXP(),
      getWeeklyMilestones(),
    ]).then(([g, s, ach, xp, ms]) => {
      setGoals(g);
      setStats(s);
      setAchievements(ach);
      setTotalXP(xp);
      setMilestones(ms);
    });
  }, []);

  async function handleSave() {
    await saveGoals(goals);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function pct(current, target) {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  const progress = [
    { label: "WPM", current: stats?.avgWpm ?? 0, target: goals.wpm, unit: "" },
    {
      label: "Accuracy",
      current: stats?.avgAccuracy ?? 0,
      target: goals.accuracy,
      unit: "%",
    },
    {
      label: "Tests",
      current: stats?.testCount ?? 0,
      target: goals.tests,
      unit: "",
    },
    {
      label: "Practice",
      current: stats?.practiceMinutes ?? 0,
      target: goals.minutes,
      unit: "min",
    },
  ];

  // XP level info
  const level = xpToLevel(totalXP);
  const xpCurrent = xpForCurrentLevel(totalXP);
  const xpNext = xpForNextLevel(totalXP);
  const xpIntoLevel = totalXP - xpCurrent;
  const xpNeeded = xpNext != null ? xpNext - xpCurrent : null;
  const xpPct = xpNeeded ? Math.round((xpIntoLevel / xpNeeded) * 100) : 100;

  return (
    <div className="ff-goals">
      {/* ── XP & Level ── */}
      <section className="ff-xp-section">
        <div className="ff-xp-header">
          <span className="ff-xp-level">Lvl {level}</span>
          <span className="ff-xp-total">{totalXP} XP total</span>
        </div>
        <div className="ff-progress-bar">
          <div
            className="ff-progress-fill ff-xp-fill"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <div className="ff-xp-sub">
          {xpNext != null
            ? `${xpIntoLevel} / ${xpNeeded} XP to Level ${level + 1}`
            : "Max level reached 🏆"}
        </div>
      </section>

      {/* ── Daily Goals ── */}
      <h2 className="ff-section-title">Today's Goals</h2>
      <div className="ff-progress-list">
        {progress.map((p) => (
          <div key={p.label} className="ff-progress-item">
            <div className="ff-progress-header">
              <span>{p.label}</span>
              <span>
                {p.current}
                {p.unit} / {p.target}
                {p.unit}
              </span>
            </div>
            <div className="ff-progress-bar">
              <div
                className="ff-progress-fill"
                style={{ width: `${pct(p.current, p.target)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Goal editor ── */}
      <h2 className="ff-section-title">Set Goals</h2>
      <div className="ff-goal-editor">
        {[
          { key: "wpm", label: "Target WPM" },
          { key: "accuracy", label: "Target Accuracy (%)" },
          { key: "tests", label: "Tests per day" },
          { key: "minutes", label: "Practice (min/day)" },
        ].map(({ key, label }) => (
          <label key={key} className="ff-goal-row">
            <span>{label}</span>
            <input
              type="number"
              className="ff-input-sm"
              value={goals[key]}
              min={0}
              onChange={(e) =>
                setGoals((g) => ({ ...g, [key]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
        <button className="ff-btn" onClick={handleSave}>
          {saved ? "Saved ✓" : "Save Goals"}
        </button>
      </div>

      {/* ── Weekly Milestones ── */}
      <h2 className="ff-section-title">Weekly Milestones</h2>
      <ul className="ff-milestone-list">
        {milestones.length === 0 ? (
          <li className="ff-empty">Play at least 2 weeks to see milestones.</li>
        ) : (
          milestones.map((m) => (
            <li
              key={m.id}
              className={`ff-milestone ${m.achieved ? "achieved" : ""}`}
            >
              <span className="ff-milestone-dot">{m.achieved ? "✓" : "○"}</span>
              {m.label}
            </li>
          ))
        )}
      </ul>

      {/* ── Achievement Badges ── */}
      <h2 className="ff-section-title">Achievements</h2>
      <div className="ff-badge-grid">
        {ACHIEVEMENTS_CATALOG.map((ach) => {
          const unlocked = achievements.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`ff-badge ${unlocked ? "unlocked" : "locked"}`}
              title={ach.desc}
            >
              <span className="ff-badge-icon">{ach.icon}</span>
              <span className="ff-badge-label">{ach.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
