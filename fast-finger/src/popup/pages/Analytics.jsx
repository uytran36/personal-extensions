import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  getSessions,
  detectPlateau,
  detectFatigue,
  speedProjection,
  getSmartRecommendations,
  getPerformanceSegmentation,
  getCodeVsProseSplit,
  getGoals,
} from "../../utils/storage.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

const RANGES = ["daily", "weekly", "monthly", "all"];

function filterByRange(sessions, range) {
  const ms = {
    daily: 86400000,
    weekly: 604800000,
    monthly: 2592000000,
    all: Infinity,
  };
  const cutoff = Date.now() - (ms[range] ?? Infinity);
  return sessions.filter((s) => new Date(s.createdAt).getTime() >= cutoff);
}

function rollingAvg(data, window = 5) {
  return data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1);
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
  });
}

function calcConsistencyScore(wpms) {
  if (wpms.length < 2) return null;
  const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  if (mean === 0) return 0;
  const variance =
    wpms.reduce((sum, v) => sum + (v - mean) ** 2, 0) / wpms.length;
  const stddev = Math.sqrt(variance);
  return Math.max(0, Math.round(100 - (stddev / mean) * 100));
}

export default function Analytics() {
  const [range, setRange] = useState("weekly");
  const [sessions, setSessions] = useState([]);
  const [plateau, setPlateau] = useState(null);
  const [fatigue, setFatigue] = useState(null);
  const [projection, setProjection] = useState(null);
  const [tips, setTips] = useState([]);
  const [segmentation, setSegmentation] = useState(null);
  const [codeSplit, setCodeSplit] = useState(null);

  useEffect(() => {
    getSessions().then(setSessions);
    detectPlateau(7).then(setPlateau);
    detectFatigue().then(setFatigue);
    getSmartRecommendations().then(setTips);
    getPerformanceSegmentation().then(setSegmentation);
    getCodeVsProseSplit().then(setCodeSplit);
    getGoals().then((g) => speedProjection(g.wpm).then(setProjection));
  }, []);

  const filtered = filterByRange(sessions, range).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

  const labels = filtered.map((s) =>
    new Date(s.createdAt).toLocaleDateString(),
  );
  const wpmData = filtered.map((s) => s.wpm);
  const accData = filtered.map((s) => s.accuracy);
  const rolling = rollingAvg(wpmData);
  const score = calcConsistencyScore(wpmData);

  const wpmChart = {
    labels,
    datasets: [
      {
        label: "WPM",
        data: wpmData,
        borderColor: "#6c63ff",
        backgroundColor: "rgba(108,99,255,0.1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Rolling Avg",
        data: rolling,
        borderColor: "#ff6584",
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 0,
      },
    ],
  };

  const accChart = {
    labels,
    datasets: [
      {
        label: "Accuracy %",
        data: accData,
        borderColor: "#43aa8b",
        backgroundColor: "rgba(67,170,139,0.1)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const chartOpts = {
    responsive: true,
    plugins: { legend: { position: "bottom" } },
    scales: { y: { beginAtZero: false } },
  };

  return (
    <div className="ff-analytics">
      {/* ── Plateau Alert ── */}
      {plateau?.detected && (
        <div className="ff-alert ff-alert-warn">
          <span className="ff-alert-icon">⚠️</span>
          <span>
            WPM stuck at {plateau.minWpm}–{plateau.maxWpm} for {plateau.days}{" "}
            days. Try punctuation or code mode to break through.
          </span>
        </div>
      )}

      {/* ── Fatigue Alert ── */}
      {fatigue?.fatigued && (
        <div className="ff-alert ff-alert-danger">
          <span className="ff-alert-icon">😴</span>
          <span>
            Fatigue detected — accuracy dropped {fatigue.accDrop}% today. Take a
            break!
          </span>
        </div>
      )}

      {/* ── Speed Projection ── */}
      {projection && (
        <div className="ff-projection-card">
          <div className="ff-projection-title">Speed Projection</div>
          {projection.daysLeft === 0 ? (
            <div className="ff-projection-val">🎉 Goal reached!</div>
          ) : projection.daysLeft == null ? (
            <div className="ff-projection-val ff-projection-sub">
              Not enough progress data yet
            </div>
          ) : (
            <>
              <div className="ff-projection-val">
                {projection.daysLeft} days
              </div>
              <div className="ff-projection-sub">
                to reach {projection.targetWpm} WPM goal
                {projection.slope != null &&
                  ` · +${projection.slope} WPM/day trend`}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Range tabs ── */}
      <div className="ff-range-tabs">
        {RANGES.map((r) => (
          <button
            key={r}
            className={`ff-tab-sm ${range === r ? "active" : ""}`}
            onClick={() => setRange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* ── Consistency Score ── */}
      {filtered.length >= 2 && (
        <div className="ff-consistency-banner">
          <span className="ff-consistency-label">Consistency Score</span>
          <span className="ff-consistency-value">
            {score != null ? `${score}/100` : "—"}
          </span>
        </div>
      )}

      {/* ── Charts ── */}
      {filtered.length < 2 ? (
        <p className="ff-empty">Need at least 2 sessions to show charts.</p>
      ) : (
        <>
          <h3 className="ff-chart-title">WPM Over Time</h3>
          <Line data={wpmChart} options={chartOpts} />
          <h3 className="ff-chart-title">Accuracy Over Time</h3>
          <Line data={accChart} options={chartOpts} />
        </>
      )}

      {/* ── Performance Segmentation ── */}
      {segmentation && (
        <>
          <h3 className="ff-chart-title">Best Time to Type</h3>
          <div className="ff-seg-grid">
            {Object.entries(segmentation.timeOfDay).map(([label, wpm]) =>
              wpm != null ? (
                <div key={label} className="ff-seg-card">
                  <div className="ff-seg-val">{wpm}</div>
                  <div className="ff-seg-label">{label}</div>
                </div>
              ) : null,
            )}
          </div>
          <div className="ff-seg-row">
            {segmentation.dayType.weekday != null && (
              <div className="ff-seg-pill">
                Weekday avg: <strong>{segmentation.dayType.weekday} WPM</strong>
              </div>
            )}
            {segmentation.dayType.weekend != null && (
              <div className="ff-seg-pill">
                Weekend avg: <strong>{segmentation.dayType.weekend} WPM</strong>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Code vs Prose ── */}
      {codeSplit && (codeSplit.code || codeSplit.prose) && (
        <>
          <h3 className="ff-chart-title">Code vs Prose</h3>
          <div className="ff-seg-grid">
            {codeSplit.prose && (
              <div className="ff-seg-card">
                <div className="ff-seg-val">{codeSplit.prose.avgWpm}</div>
                <div className="ff-seg-label">prose WPM</div>
                <div className="ff-seg-sub">
                  {codeSplit.prose.count} tests · {codeSplit.prose.avgAccuracy}%
                  acc
                </div>
              </div>
            )}
            {codeSplit.code && (
              <div className="ff-seg-card ff-seg-card-code">
                <div className="ff-seg-val">{codeSplit.code.avgWpm}</div>
                <div className="ff-seg-label">code WPM</div>
                <div className="ff-seg-sub">
                  {codeSplit.code.count} tests · {codeSplit.code.avgAccuracy}%
                  acc
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Smart Recommendations ── */}
      {tips.length > 0 && (
        <>
          <h3 className="ff-chart-title">Smart Recommendations</h3>
          <ul className="ff-tips-list">
            {tips.map((tip, i) => (
              <li key={i} className="ff-tip">
                <span className="ff-tip-icon">💡</span>
                {tip}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
