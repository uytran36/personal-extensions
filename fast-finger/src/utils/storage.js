/**
 * Storage utility – wraps chrome.storage.local with simple helpers.
 * Keys:
 *   sessions   → Array<SessionPayload>
 *   streak     → { count, lastDate, longest }
 *   goals      → { wpm, accuracy, tests, minutes }
 *   achievements → string[]
 */

const STORAGE_KEYS = ["sessions", "streak", "goals", "achievements", "xp"];
const BACKUP_VERSION = 1;

// ── Sessions ─────────────────────────────────────────────────────────────────

/** @returns {Promise<Object[]>} */
export async function getSessions() {
  const result = await chrome.storage.local.get("sessions");
  return result.sessions || [];
}

/** @param {Object} payload */
export async function saveSession(payload) {
  const sessions = await getSessions();
  sessions.push({ ...payload, id: crypto.randomUUID() });
  await chrome.storage.local.set({ sessions });
}

/** @param {string} id */
export async function deleteSession(id) {
  const sessions = await getSessions();
  await chrome.storage.local.set({
    sessions: sessions.filter((s) => s.id !== id),
  });
}

// ── Stats aggregation ─────────────────────────────────────────────────────────

/**
 * @param {"daily"|"weekly"|"monthly"|"all"} range
 */
export async function getStats(range = "weekly") {
  const sessions = await getSessions();
  const filtered = filterByRange(sessions, range);
  if (!filtered.length) return null;

  const wpms = filtered.map((s) => s.wpm).filter(Boolean);
  const accs = filtered.map((s) => s.accuracy).filter(Boolean);
  const totalMinutes =
    filtered.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

  return {
    avgWpm: avg(wpms),
    peakWpm: Math.max(...wpms),
    avgAccuracy: avg(accs),
    practiceMinutes: Math.round(totalMinutes),
    testCount: filtered.length,
    consistencyScore: consistencyScore(wpms),
    sessions: filtered,
  };
}

// ── Streak ────────────────────────────────────────────────────────────────────

export async function getStreak() {
  const result = await chrome.storage.local.get("streak");
  return result.streak || { count: 0, lastDate: null, longest: 0 };
}

export async function saveStreak(streak) {
  const current = await getStreak();
  await chrome.storage.local.set({ streak: { ...current, ...streak } });
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function getGoals() {
  const result = await chrome.storage.local.get("goals");
  return result.goals || { wpm: 80, accuracy: 97, tests: 10, minutes: 30 };
}

export async function saveGoals(goals) {
  await chrome.storage.local.set({ goals });
}

// ── Achievements ──────────────────────────────────────────────────────────────

export const ACHIEVEMENTS_CATALOG = [
  {
    id: "first_test",
    label: "First Steps",
    desc: "Complete your first test",
    icon: "🏁",
  },
  { id: "wpm_60", label: "Speed Demon", desc: "Reach 60 WPM", icon: "⚡" },
  { id: "wpm_80", label: "Pro Typist", desc: "Reach 80 WPM", icon: "🚀" },
  { id: "wpm_100", label: "Centurion", desc: "Reach 100 WPM", icon: "💯" },
  {
    id: "acc_99",
    label: "Accuracy Master",
    desc: "Achieve 99% accuracy",
    icon: "🎯",
  },
  { id: "streak_7", label: "On Fire", desc: "7-day streak", icon: "🔥" },
  { id: "streak_30", label: "Dedication", desc: "30-day streak", icon: "🏆" },
  {
    id: "tests_100",
    label: "Century Club",
    desc: "Complete 100 tests",
    icon: "💪",
  },
  {
    id: "tests_1000",
    label: "Keyboard Warrior",
    desc: "Complete 1000 tests",
    icon: "⚔️",
  },
];

export async function getAchievements() {
  const result = await chrome.storage.local.get("achievements");
  return result.achievements || [];
}

export async function unlockAchievement(id) {
  const list = await getAchievements();
  if (!list.includes(id)) {
    await chrome.storage.local.set({ achievements: [...list, id] });
    return true; // newly unlocked
  }
  return false;
}

// ── XP & Level ────────────────────────────────────────────────────────────────

// XP required to reach each level (index = level - 1)
const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000];

export function xpToLevel(totalXP) {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (totalXP >= LEVEL_XP[i]) level = i + 1;
    else break;
  }
  return level;
}

export function xpForNextLevel(totalXP) {
  const level = xpToLevel(totalXP);
  return LEVEL_XP[level] ?? null; // null = max level
}

export function xpForCurrentLevel(totalXP) {
  const level = xpToLevel(totalXP);
  return LEVEL_XP[level - 1] ?? 0;
}

export async function getXP() {
  const result = await chrome.storage.local.get("xp");
  return result.xp ?? 0;
}

export async function addXP(amount) {
  const current = await getXP();
  const updated = current + amount;
  await chrome.storage.local.set({ xp: updated });
  return updated;
}

// ── Weekly Milestones ─────────────────────────────────────────────────────────

export async function getWeeklyMilestones() {
  const sessions = await getSessions();
  const now = Date.now();

  const thisWeek = sessions.filter(
    (s) => new Date(s.createdAt).getTime() >= now - 7 * 86400000,
  );
  const lastWeek = sessions.filter((s) => {
    const t = new Date(s.createdAt).getTime();
    return t >= now - 14 * 86400000 && t < now - 7 * 86400000;
  });

  const milestones = [];

  if (thisWeek.length > 0 && lastWeek.length > 0) {
    const thisWpms = thisWeek.map((s) => s.wpm).filter(Boolean);
    const lastWpms = lastWeek.map((s) => s.wpm).filter(Boolean);
    const diff = avg(thisWpms) - avg(lastWpms);
    if (diff > 0) {
      milestones.push({
        id: "wpm_up",
        label: `+${diff} WPM vs last week`,
        achieved: true,
      });
    } else if (diff < 0) {
      milestones.push({
        id: "wpm_down",
        label: `${diff} WPM vs last week`,
        achieved: false,
      });
    } else {
      milestones.push({
        id: "wpm_same",
        label: "WPM held steady vs last week",
        achieved: true,
      });
    }

    const thisAccs = thisWeek.map((s) => s.accuracy).filter(Boolean);
    const lastAccs = lastWeek.map((s) => s.accuracy).filter(Boolean);
    const accDiff = avg(thisAccs) - avg(lastAccs);
    if (accDiff > 0) {
      milestones.push({
        id: "acc_up",
        label: `Accuracy up ${accDiff}% vs last week`,
        achieved: true,
      });
    }
  }

  if (thisWeek.length >= 20) {
    milestones.push({
      id: "tests_20_week",
      label: "20+ tests this week 💪",
      achieved: true,
    });
  } else {
    milestones.push({
      id: "tests_20_week",
      label: `${thisWeek.length}/20 tests this week`,
      achieved: false,
    });
  }

  const streak = await getStreak();
  if (streak.count >= 7) {
    milestones.push({
      id: "streak_7",
      label: `${streak.count}-day streak 🔥`,
      achieved: true,
    });
  } else {
    milestones.push({
      id: "streak_active",
      label: `${streak.count} day streak — keep going!`,
      achieved: streak.count > 0,
    });
  }

  return milestones;
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportJSON() {
  const sessions = await getSessions();
  return JSON.stringify(sessions, null, 2);
}

export async function exportBackupJSON() {
  const data = await chrome.storage.local.get(STORAGE_KEYS);
  const backup = {
    schema: "fast-finger-backup",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      sessions: normalizeSessions(data.sessions),
      streak: normalizeStreak(data.streak),
      goals: normalizeGoals(data.goals),
      achievements: normalizeAchievements(data.achievements),
      xp: normalizeXP(data.xp),
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Imports either:
 * 1) full backup object from exportBackupJSON(), or
 * 2) legacy sessions array (exportJSON output).
 */
export async function importBackupJSON(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  if (Array.isArray(parsed)) {
    const sessions = normalizeSessions(parsed);
    await chrome.storage.local.set({ sessions });
    return {
      importedKeys: ["sessions"],
      sessionCount: sessions.length,
    };
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Unsupported backup format.");
  }

  const payload =
    parsed.schema === "fast-finger-backup" && parsed.data
      ? parsed.data
      : parsed;

  const hasKnownKeys = STORAGE_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

  if (!hasKnownKeys) {
    throw new Error("Backup does not contain supported data keys.");
  }

  const toSave = {};

  if (Object.prototype.hasOwnProperty.call(payload, "sessions")) {
    toSave.sessions = normalizeSessions(payload.sessions);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "streak")) {
    toSave.streak = normalizeStreak(payload.streak);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "goals")) {
    toSave.goals = normalizeGoals(payload.goals);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "achievements")) {
    toSave.achievements = normalizeAchievements(payload.achievements);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "xp")) {
    toSave.xp = normalizeXP(payload.xp);
  }

  await chrome.storage.local.set(toSave);

  return {
    importedKeys: Object.keys(toSave),
    sessionCount:
      typeof toSave.sessions === "undefined" ? null : toSave.sessions.length,
  };
}

export async function clearAllData() {
  await chrome.storage.local.remove(STORAGE_KEYS);
}

export async function exportCSV() {
  const sessions = await getSessions();
  if (!sessions.length) return "";
  const headers = Object.keys(sessions[0]).join(",");
  const rows = sessions.map((s) => Object.values(s).join(","));
  return [headers, ...rows].join("\n");
}

// ── Phase 4: Advanced Analytics ───────────────────────────────────────────────

/**
 * 4.1 Plateau Detection
 * Returns plateau info if WPM hasn't improved meaningfully in `days` days.
 */
export async function detectPlateau(days = 7) {
  const sessions = await getSessions();
  const cutoff = Date.now() - days * 86400000;
  const recent = sessions
    .filter((s) => new Date(s.createdAt).getTime() >= cutoff)
    .map((s) => s.wpm)
    .filter(Boolean);

  if (recent.length < 3) return null;

  const minWpm = Math.min(...recent);
  const maxWpm = Math.max(...recent);
  const range = maxWpm - minWpm;

  // Plateau = WPM range < 5 over the window
  if (range < 5) {
    return { detected: true, minWpm, maxWpm, days, range };
  }
  return { detected: false, minWpm, maxWpm, days, range };
}

/**
 * 4.4 Fatigue Detection
 * Compares accuracy of first vs last 3 sessions today.
 */
export async function detectFatigue() {
  const sessions = await getSessions();
  const today = sessions
    .filter(
      (s) => new Date(s.createdAt).toDateString() === new Date().toDateString(),
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (today.length < 4) return null;

  const first3Acc = avg(
    today
      .slice(0, 3)
      .map((s) => s.accuracy)
      .filter(Boolean),
  );
  const last3Acc = avg(
    today
      .slice(-3)
      .map((s) => s.accuracy)
      .filter(Boolean),
  );
  const first3Wpm = avg(
    today
      .slice(0, 3)
      .map((s) => s.wpm)
      .filter(Boolean),
  );
  const last3Wpm = avg(
    today
      .slice(-3)
      .map((s) => s.wpm)
      .filter(Boolean),
  );

  const accDrop = first3Acc - last3Acc;
  const wpmDrop = first3Wpm - last3Wpm;
  const fatigued = accDrop >= 3 || wpmDrop >= 5;

  return { fatigued, accDrop, wpmDrop, sessionCount: today.length };
}

/**
 * 4.5 Speed Projection
 * Linear regression on last 30 days to estimate days to targetWpm.
 */
export async function speedProjection(targetWpm) {
  const sessions = await getSessions();
  const cutoff = Date.now() - 30 * 86400000;
  const recent = sessions
    .filter((s) => new Date(s.createdAt).getTime() >= cutoff && s.wpm)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (recent.length < 5) return null;

  const currentAvg = avg(recent.slice(-5).map((s) => s.wpm));
  if (currentAvg >= targetWpm) return { daysLeft: 0, currentAvg, targetWpm };

  // Convert to [day index, wpm] pairs
  const base = new Date(recent[0].createdAt).getTime();
  const points = recent.map((s) => [
    (new Date(s.createdAt).getTime() - base) / 86400000,
    s.wpm,
  ]);

  // Linear regression
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p[0], 0);
  const sumY = points.reduce((a, p) => a + p[1], 0);
  const sumXY = points.reduce((a, p) => a + p[0] * p[1], 0);
  const sumX2 = points.reduce((a, p) => a + p[0] * p[0], 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  if (slope <= 0) return { daysLeft: null, currentAvg, targetWpm }; // not improving

  const lastDay = points[points.length - 1][0];
  const lastWpm = points[points.length - 1][1];
  const daysLeft = Math.ceil((targetWpm - lastWpm) / slope);

  return {
    daysLeft: Math.max(1, daysLeft),
    currentAvg,
    targetWpm,
    slope: Math.round(slope * 10) / 10,
  };
}

/**
 * 4.6 Smart Recommendations
 * Rule-based tips derived from historical stats.
 */
export async function getSmartRecommendations() {
  const sessions = await getSessions();
  const tips = [];

  if (sessions.length < 3) {
    return ["Complete a few more tests to get personalized recommendations."];
  }

  const recent = sessions.slice(-20);
  const wpms = recent.map((s) => s.wpm).filter(Boolean);
  const accs = recent.map((s) => s.accuracy).filter(Boolean);
  const avgWpm = avg(wpms);
  const avgAcc = avg(accs);

  // Low accuracy
  if (avgAcc < 95) {
    tips.push("Focus on accuracy over speed — try slowing down 10 WPM.");
    tips.push("Accuracy is below 95%. Drill weak keys before speed bursts.");
  } else if (avgAcc >= 99) {
    tips.push("Excellent accuracy! You can safely push for more speed.");
  }

  // Consistency
  const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  const variance = wpms.reduce((s, v) => s + (v - mean) ** 2, 0) / wpms.length;
  const cv = (Math.sqrt(variance) / mean) * 100;
  if (cv > 15) {
    tips.push("Your WPM varies a lot. Focus on rhythm over raw speed.");
    tips.push("Try longer tests (120s) to train consistent pacing.");
  }

  // Plateau check
  const plateau = await detectPlateau(7);
  if (plateau?.detected) {
    tips.push(
      `WPM stuck at ${plateau.minWpm}–${plateau.maxWpm} for 7 days. Try punctuation or code mode.`,
    );
    tips.push("Switch to a different test mode to break through a plateau.");
  }

  // Speed range
  if (avgWpm < 50) {
    tips.push("Practice fundamental finger placement — home row drills help.");
  } else if (avgWpm < 70) {
    tips.push("Focus on common words — top 200 words cover 60% of text.");
  } else if (avgWpm >= 100) {
    tips.push(
      "Elite territory! Consider code or punctuation modes for a new challenge.",
    );
  }

  // Accuracy vs speed imbalance
  if (avgAcc > 97 && avgWpm < 70) {
    tips.push(
      "Your accuracy is great but speed is low — push harder, be bolder.",
    );
  }
  if (avgAcc < 93 && avgWpm > 80) {
    tips.push(
      "Speed is high but accuracy suffers. Slow down and fix errors first.",
    );
  }

  return tips.slice(0, 4); // max 4 tips
}

/**
 * 4.9 Performance Segmentation
 * Groups sessions by time of day and weekday/weekend.
 */
export async function getPerformanceSegmentation() {
  const sessions = await getSessions();
  if (sessions.length < 5) return null;

  const segments = {
    morning: [], // 6–12
    afternoon: [], // 12–18
    evening: [], // 18–23
    night: [], // 23–6
    weekday: [],
    weekend: [],
  };

  for (const s of sessions) {
    const d = new Date(s.createdAt);
    const h = d.getHours();
    const day = d.getDay(); // 0=Sun, 6=Sat

    if (h >= 6 && h < 12) segments.morning.push(s.wpm);
    else if (h >= 12 && h < 18) segments.afternoon.push(s.wpm);
    else if (h >= 18 && h < 23) segments.evening.push(s.wpm);
    else segments.night.push(s.wpm);

    if (day === 0 || day === 6) segments.weekend.push(s.wpm);
    else segments.weekday.push(s.wpm);
  }

  return {
    timeOfDay: {
      morning: segments.morning.length ? avg(segments.morning) : null,
      afternoon: segments.afternoon.length ? avg(segments.afternoon) : null,
      evening: segments.evening.length ? avg(segments.evening) : null,
      night: segments.night.length ? avg(segments.night) : null,
    },
    dayType: {
      weekday: segments.weekday.length ? avg(segments.weekday) : null,
      weekend: segments.weekend.length ? avg(segments.weekend) : null,
    },
  };
}

/**
 * 4.10 Code Typing Mode Analytics
 * Stats split between code modes and prose modes.
 */
export async function getCodeVsProseSplit() {
  const sessions = await getSessions();
  if (!sessions.length) return null;

  const CODE_MODES = [
    "code",
    "typescript",
    "javascript",
    "python",
    "rust",
    "go",
    "java",
    "c",
    "cpp",
  ];
  const isCode = (s) =>
    CODE_MODES.some((k) => (s.mode || "").toLowerCase().includes(k));

  const code = sessions.filter(isCode);
  const prose = sessions.filter((s) => !isCode(s));

  const summarize = (arr) => {
    if (!arr.length) return null;
    const wpms = arr.map((s) => s.wpm).filter(Boolean);
    const accs = arr.map((s) => s.accuracy).filter(Boolean);
    return { count: arr.length, avgWpm: avg(wpms), avgAccuracy: avg(accs) };
  };

  return { code: summarize(code), prose: summarize(prose) };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

/**
 * Consistency Score 0–100.
 * Based on coefficient of variation (stddev / mean).
 * Lower variance → higher score.
 */
function consistencyScore(wpms) {
  if (wpms.length < 2) return null;
  const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  if (mean === 0) return 0;
  const variance =
    wpms.reduce((sum, v) => sum + (v - mean) ** 2, 0) / wpms.length;
  const stddev = Math.sqrt(variance);
  const cv = (stddev / mean) * 100; // coefficient of variation %
  return Math.max(0, Math.round(100 - cv));
}

function filterByRange(sessions, range) {
  const now = Date.now();
  const ms = {
    daily: 86400000,
    weekly: 7 * 86400000,
    monthly: 30 * 86400000,
    all: Infinity,
  };
  const cutoff = now - (ms[range] ?? Infinity);
  return sessions.filter((s) => new Date(s.createdAt).getTime() >= cutoff);
}

function normalizeSessions(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      ...s,
      id: typeof s.id === "string" && s.id ? s.id : crypto.randomUUID(),
      createdAt:
        typeof s.createdAt === "string" && s.createdAt
          ? s.createdAt
          : new Date().toISOString(),
    }));
}

function normalizeStreak(value) {
  const base = { count: 0, lastDate: null, longest: 0 };
  if (!value || typeof value !== "object") return base;

  return {
    count: Number.isFinite(value.count) ? Math.max(0, value.count) : 0,
    lastDate: typeof value.lastDate === "string" ? value.lastDate : null,
    longest: Number.isFinite(value.longest) ? Math.max(0, value.longest) : 0,
  };
}

function normalizeGoals(value) {
  const base = { wpm: 80, accuracy: 97, tests: 10, minutes: 30 };
  if (!value || typeof value !== "object") return base;

  return {
    wpm: Number.isFinite(value.wpm) ? Math.max(1, value.wpm) : base.wpm,
    accuracy: Number.isFinite(value.accuracy)
      ? Math.min(100, Math.max(1, value.accuracy))
      : base.accuracy,
    tests: Number.isFinite(value.tests) ? Math.max(1, value.tests) : base.tests,
    minutes: Number.isFinite(value.minutes)
      ? Math.max(1, value.minutes)
      : base.minutes,
  };
}

function normalizeAchievements(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string");
}

function normalizeXP(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
