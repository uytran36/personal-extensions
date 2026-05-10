# Typing Progress Tracker

## Overview

A Chrome Extension that automatically tracks typing performance from popular typing websites and provides advanced analytics, progress tracking, and AI-powered coaching.

Supported platforms:

- Monkeytype

---

# Core Features

## 1. Auto Capture Typing Results

Automatically detect completed typing tests and save results.

### Captured Data

- WPM
- Raw WPM
- Accuracy
- Test duration
- Language
- Typing mode
- Timestamp

### Example Payload

```json
{
  "wpm": 72,
  "rawWpm": 79,
  "accuracy": 97,
  "duration": 60,
  "mode": "english_1k",
  "createdAt": "2026-05-10T12:00:00Z"
}
```

---

## 2. Session History

Store and manage all typing sessions.

### Features

- Search sessions
- Filter by date
- Delete sessions
- Export CSV/JSON

---

## 3. Daily & Weekly Statistics

### Metrics

- Average WPM
- Peak WPM
- Average accuracy
- Practice time
- Number of tests
- Consistency score

---

# Analytics Engine

## 4. Progress Graphs

Visualize long-term improvement.

### Charts

- WPM over time
- Accuracy over time
- Rolling average
- Weekly trend

### Time Ranges

- Daily
- Weekly
- Monthly
- All-time

---

## 5. Plateau Detection

Detect stagnant improvement periods.

### Example Insight

```txt
Your WPM has stayed between 72–75
for the last 11 days.
```

### Suggested Actions

- Longer typing tests
- Slow accuracy drills
- Punctuation practice
- Code typing mode

---

## 6. Weakness Analysis

Analyze typing weaknesses.

### Detect

- Weak keys
- Weak finger zones
- Problematic bigrams
- Symbol slowdown

### Example

```txt
Weakest keys:
P, ;, [
```

---

## 7. Consistency Score

Measure typing stability.

### Factors

- WPM variance
- Pause frequency
- Correction frequency
- Rhythm stability

### Example

```txt
Consistency Score: 84/100
```

---

# Goal System

## 8. Daily Goals

Users can set goals such as:

- Reach 80 WPM
- Maintain 97% accuracy
- Complete 10 tests
- Practice 30 minutes

---

## 9. Weekly Milestones

Examples:

- +5 WPM improvement
- Accuracy increase
- Maintain streaks

---

## 10. Smart Recommendations

Provide personalized coaching.

### Example

```txt
Your accuracy is improving faster than speed.

Recommended:
Focus on rhythm instead of corrections.
```

---

# Gamification

## 11. Streak System

Track:

- Daily streak
- Weekly streak
- Longest streak

---

## 12. Achievement Badges

Examples:

- First 60 WPM
- Accuracy Master
- 7-day streak
- 1000 tests completed

---

## 13. XP & Levels

Users gain XP from:

- Practice time
- Consistency
- Accuracy
- Streaks

---

# Developer Typing Mode

## 14. Code Typing Analytics

Track code typing separately from prose typing.

### Supported Languages

- TypeScript
- JavaScript
- Python
- Rust
- Go

---

## 15. Symbol Performance

Analyze typing speed on:

- Brackets
- Quotes
- Semicolons
- Operators

### Example

```txt
Average slowdown on symbols:
28%
```

---

## 16. IDE Integration (Future)

Possible integrations:

- VS Code
- JetBrains IDEs
- Neovim

### Track

- Real coding speed
- Typing latency
- Correction frequency

---

# Overlay UI

## 17. In-Page Progress Widget

Inject overlay into typing websites.

### Display

- Daily goal
- Current streak
- Average WPM
- Next milestone

---

## 18. Real-Time Feedback

Provide live performance metrics.

### Metrics

- Live consistency
- Live accuracy trend
- Fatigue detection

---

## 19. Speed Projection

Estimate future typing performance.

### Example

```txt
Estimated time to 90 WPM:
34 days
```

---

## 20. Personalized Training Plans

Generate training plans based on:

- Weak fingers
- Accuracy issues
- Fatigue patterns
- Plateau stages

---

## 21. Public Profiles

Public profile page.

### Display

- Stats
- Graphs
- Achievements
- Leaderboard rankings

---

## 22. Friend Challenges

Examples:

- Highest weekly WPM
- Longest streak
- Best consistency

---

# Advanced Analytics

## 23. Keyboard Heatmap

Visualize:

- Most-used keys
- Slowest keys
- Error zones

---

## 24. Fatigue Detection

Detect signs of typing fatigue.

### Signals

- Falling accuracy
- Increased pauses
- Rhythm instability

---

## 25. Performance Segmentation

Compare performance across:

- Morning vs night
- Weekday vs weekend
- Short vs long sessions

---

# Phase 1 — Foundation & Data Capture (MVP) - DONE

Goal: Extension hoạt động được, capture data từ 3 sites.

# Task File

1.1 Setup Manifest V3, permissions, icons manifest.json
1.2 Content script cho Monkeytype (detect test end, scrape WPM/acc/duration) content/sites/monkeytype.js
1.3 Storage layer: lưu sessions vào chrome.storage.local utils/storage.js
1.4 Service worker nhận message từ content scripts background/service-worker.js
1.5 Popup: Dashboard hiển thị last 5 sessions + today stats popup/pages/Dashboard.jsx
Payload schema:

```
{
"id": "uuid",
"wpm": 72,
"rawWpm": 79,
"accuracy": 97,
"duration": 60,
"mode": "english_1k",
"createdAt": "2026-05-10T12:00:00Z"
}
```

# Phase 2 — History & Analytics

Goal: Xem lịch sử, thống kê, biểu đồ.

# Task

2.1 History page: list sessions, filter by date/site, search, delete
2.2 Daily & Weekly stats aggregation (avg WPM, peak, accuracy, practice time)
2.3 Charts: WPM over time, accuracy over time, rolling average (Chart.js)
2.4 Time range selector: Daily / Weekly / Monthly / All-time
2.5 Export CSV / JSON
2.6 Consistency Score algorithm (WPM variance, pause freq)

# Phase 3 — Goals & Gamification

Goal: Người dùng có động lực luyện tập.

# Task

3.1 Daily Goals UI: set target WPM, accuracy, test count, practice time
3.2 Goal tracking logic + progress bar
3.3 Weekly Milestones (+5 WPM, streak maintenance)
3.4 Streak system (daily + weekly, stored in service worker + alarms)
3.5 Achievement badges (First 60 WPM, Accuracy Master, 7-day streak…)
3.6 XP & Level system (gain XP từ practice time, accuracy, streaks)

# Phase 4 — Advanced Analytics & Overlay

Goal: Insights sâu, overlay real-time trên typing sites.

# Task

4.1 Plateau detection: alert khi WPM không tăng sau N ngày
4.2 Weakness analysis: weak keys, problematic bigrams (cần raw keypress data)
4.3 Keyboard heatmap visualization
4.4 Fatigue detection: falling accuracy + rhythm instability trong session
4.5 Speed projection: estimated days to next WPM milestone
4.6 Smart recommendations engine
4.7 In-page overlay widget (inject vào typing sites): streak, daily goal, avg WPM
4.8 Real-time feedback overlay (live consistency, accuracy trend)
4.9 Performance segmentation (morning vs night, weekday vs weekend)
4.10 Code typing mode analytics (TypeScript, Python, etc.)

# Phase 5 — Social & Developer Features (Future)

# Task

5.1 Public profiles (backend cần thiết)
5.2 Friend challenges
5.3 Personalized training plans
5.4 IDE integration (VS Code extension)
