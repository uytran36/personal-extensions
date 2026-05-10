import {
  saveSession,
  getStats,
  getStreak,
  saveStreak,
  getSessions,
  getXP,
  addXP,
  unlockAchievement,
  ACHIEVEMENTS_CATALOG,
} from "../utils/storage.js";

// ── Message bus ──────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SAVE_SESSION") {
    handleSaveSession(message.payload).then(sendResponse);
    return true;
  }
  if (message.type === "GET_STATS") {
    getStats(message.range).then(sendResponse);
    return true;
  }
  if (message.type === "GET_STREAK") {
    getStreak().then(sendResponse);
    return true;
  }
  if (message.type === "GET_XP") {
    getXP().then(sendResponse);
    return true;
  }
});

// ── Save session & update streak / achievements / XP ─────────────────────────
async function handleSaveSession(payload) {
  await saveSession(payload);
  await updateStreak();
  await checkAchievements(payload);
  await awardXP(payload);
  return { ok: true };
}

// ── Streak logic ──────────────────────────────────────────────────────────────
async function updateStreak() {
  const streak = await getStreak();
  const today = new Date().toDateString();

  if (streak.lastDate === today) return; // already counted today

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;

  await saveStreak({ count: newCount, lastDate: today });

  if (newCount > (streak.longest || 0)) {
    await saveStreak({ count: newCount, lastDate: today, longest: newCount });
  }
}

// ── Daily alarm for streak check ─────────────────────────────────────────────
chrome.alarms.create("dailyCheck", { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyCheck") {
    updateStreak();
  }
});

// ── Achievement checker ───────────────────────────────────────────────────────
async function checkAchievements(latestSession) {
  const sessions = await getSessions();
  const streak = await getStreak();

  const conditions = {
    first_test: sessions.length >= 1,
    wpm_60: sessions.some((s) => s.wpm >= 60),
    wpm_80: sessions.some((s) => s.wpm >= 80),
    wpm_100: sessions.some((s) => s.wpm >= 100),
    acc_99: sessions.some((s) => s.accuracy >= 99),
    streak_7: streak.count >= 7,
    streak_30: streak.count >= 30,
    tests_100: sessions.length >= 100,
    tests_1000: sessions.length >= 1000,
  };

  for (const { id } of ACHIEVEMENTS_CATALOG) {
    if (conditions[id]) {
      const unlocked = await unlockAchievement(id);
      if (unlocked) {
        chrome.notifications?.create(`ff-ach-${id}`, {
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Achievement Unlocked!",
          message: ACHIEVEMENTS_CATALOG.find((a) => a.id === id)?.label ?? id,
        });
      }
    }
  }
}

// ── XP Awarding ───────────────────────────────────────────────────────────────
async function awardXP(session) {
  const streak = await getStreak();
  let xp = Math.round((session.wpm || 0) / 10); // base: WPM / 10
  if ((session.accuracy || 0) >= 99) xp += 10;
  else if ((session.accuracy || 0) >= 95) xp += 5;
  xp += Math.min(streak.count * 2, 20); // streak bonus, capped at 20
  if (xp > 0) await addXP(xp);
}
