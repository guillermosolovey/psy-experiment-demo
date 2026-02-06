/* Configuration */
const ENDPOINT_URL = ""; // Paste your Google Apps Script web app URL here
const DEMO_MODE = ENDPOINT_URL.trim() === "";
const N_TRIALS = 25;
const N_PRACTICE = 3;
const EXCL_MIN_MS = 150;
const EXCL_MAX_MS = 2000;

const appStateKey = "psyExperimentState_v1";
const demoCacheKey = "psyExperimentDemoData_v1";

const landingPanel = document.getElementById("landing");
const setupPanel = document.getElementById("setup");
const taskPanel = document.getElementById("task");
const endPanel = document.getElementById("end");
const dashboardPanel = document.getElementById("dashboard");

const startBtn = document.getElementById("startBtn");
const beginPracticeBtn = document.getElementById("beginPracticeBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const runAgainBtn = document.getElementById("runAgainBtn");
const refreshResultsBtn = document.getElementById("refreshResultsBtn");
const downloadTrialsBtn = document.getElementById("downloadTrialsBtn");
const toggleRefreshBtn = document.getElementById("toggleRefreshBtn");

const conditionInstruction = document.getElementById("conditionInstruction");
const sessionCodeInput = document.getElementById("sessionCode");
const deviceTypeInput = document.getElementById("deviceType");
const stimulusEl = document.getElementById("stimulus");
const phaseLabel = document.getElementById("phaseLabel");
const trialCounter = document.getElementById("trialCounter");
const personalSummary = document.getElementById("personalSummary");
const classResults = document.getElementById("classResults");
const interpretation = document.getElementById("interpretation");
const distributionChart = document.getElementById("distributionChart");

const dashboardSessionInput = document.getElementById("dashboardSession");
const dashboardResults = document.getElementById("dashboardResults");
const dashboardInterpretation = document.getElementById("dashboardInterpretation");
const dashboardChart = document.getElementById("dashboardChart");

let autoRefreshTimer = null;

const instructions = {
  A: "Condition A: Respond as FAST as possible.",
  B: "Condition B: Respond as ACCURATELY as possible.",
};

const state = {
  participantId: null,
  condition: null,
  sessionCode: "",
  deviceType: "",
  phase: "landing",
  trials: [],
  currentIndex: 0,
  isPractice: true,
  stimulus: null,
  stimulusOnset: null,
  submitted: false,
};

const isDashboard = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "dashboard" || window.location.hash === "#dashboard";
};

const showPanel = (panel) => {
  [landingPanel, setupPanel, taskPanel, endPanel, dashboardPanel].forEach((el) => {
    el.classList.toggle("is-active", el === panel);
  });
};

const saveState = () => {
  localStorage.setItem(appStateKey, JSON.stringify(state));
};

const loadState = () => {
  const raw = localStorage.getItem(appStateKey);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
    return true;
  } catch (error) {
    return false;
  }
};

const resetState = () => {
  state.participantId = null;
  state.condition = null;
  state.sessionCode = "";
  state.deviceType = "";
  state.phase = "landing";
  state.trials = [];
  state.currentIndex = 0;
  state.isPractice = true;
  state.stimulus = null;
  state.stimulusOnset = null;
  state.submitted = false;
  saveState();
};

const uuid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const randomStimulus = () => (Math.random() < 0.5 ? "LEFT" : "RIGHT");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const setButtonsEnabled = (enabled) => {
  leftBtn.disabled = !enabled;
  rightBtn.disabled = !enabled;
};

const setFeedback = (isCorrect) => {
  const className = isCorrect ? "feedback-good" : "feedback-bad";
  stimulusEl.classList.add(className);
  setTimeout(() => stimulusEl.classList.remove(className), 250);
};

const updateTrialCounter = () => {
  const total = state.isPractice ? N_PRACTICE : N_TRIALS;
  trialCounter.textContent = `${state.currentIndex + 1} / ${total}`;
  phaseLabel.textContent = state.isPractice ? "Practice" : "Main";
};

const startTask = async () => {
  showPanel(taskPanel);
  state.phase = "task";
  saveState();
  updateTrialCounter();
  await runNextTrial();
};

const runNextTrial = async () => {
  setButtonsEnabled(false);
  stimulusEl.textContent = "+";
  const foreperiod = 400 + Math.random() * 500;
  await wait(foreperiod);
  state.stimulus = randomStimulus();
  state.stimulusOnset = performance.now();
  stimulusEl.textContent = state.stimulus;
  setButtonsEnabled(true);
};

const recordResponse = (response) => {
  if (!state.stimulusOnset) return;
  const rt = Math.round(performance.now() - state.stimulusOnset);
  const correct = response === state.stimulus;
  state.trials.push({
    index: state.currentIndex + 1,
    phase: state.isPractice ? "practice" : "main",
    target: state.stimulus,
    response,
    correct,
    rt,
  });
  setFeedback(correct);
  state.currentIndex += 1;
  state.stimulusOnset = null;

  const total = state.isPractice ? N_PRACTICE : N_TRIALS;
  if (state.currentIndex >= total) {
    if (state.isPractice) {
      state.isPractice = false;
      state.currentIndex = 0;
      updateTrialCounter();
      wait(400).then(runNextTrial);
    } else {
      finalizeExperiment();
    }
  } else {
    updateTrialCounter();
    wait(300).then(runNextTrial);
  }
  saveState();
};

const computeSummary = () => {
  const mainTrials = state.trials.filter((t) => t.phase === "main");
  const correctTrials = mainTrials.filter((t) => t.correct);
  const cleanTrials = correctTrials.filter(
    (t) => t.rt >= EXCL_MIN_MS && t.rt <= EXCL_MAX_MS
  );
  const meanRt = cleanTrials.length
    ? Math.round(cleanTrials.reduce((sum, t) => sum + t.rt, 0) / cleanTrials.length)
    : null;
  const medianRt = cleanTrials.length
    ? median(cleanTrials.map((t) => t.rt))
    : null;
  const accuracy = mainTrials.length
    ? Math.round((correctTrials.length / mainTrials.length) * 100)
    : 0;
  return {
    nTrials: mainTrials.length,
    nCorrect: correctTrials.length,
    accuracy,
    meanRt,
    medianRt,
  };
};

const finalizeExperiment = async () => {
  state.phase = "end";
  showPanel(endPanel);
  const summary = computeSummary();
  personalSummary.innerHTML = `
    <p><strong>Condition:</strong> ${state.condition}</p>
    <p><strong>Mean RT (correct, excl.):</strong> ${summary.meanRt ?? "N/A"} ms</p>
    <p><strong>Accuracy:</strong> ${summary.accuracy}%</p>
  `;
  await submitParticipant(summary);
  await refreshClassResults();
  saveState();
};

const submitParticipant = async (summary) => {
  if (state.submitted) return;
  const payload = {
    timestamp_iso: new Date().toISOString(),
    session_code: state.sessionCode,
    participant_id: state.participantId,
    condition: state.condition,
    n_trials: summary.nTrials,
    n_correct: summary.nCorrect,
    accuracy: summary.accuracy / 100,
    mean_rt_correct_excl: summary.meanRt,
    median_rt_correct_excl: summary.medianRt,
    device_type: state.deviceType,
    user_agent: navigator.userAgent,
  };

  if (DEMO_MODE) {
    cacheDemoRow(payload);
    state.submitted = true;
    return;
  }

  try {
    await fetch(ENDPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    state.submitted = true;
  } catch (error) {
    console.error("Submission failed", error);
  }
};

const cacheDemoRow = (row) => {
  const cached = loadDemoData();
  cached.push(row);
  localStorage.setItem(demoCacheKey, JSON.stringify(cached));
};

const loadDemoData = () => {
  const raw = localStorage.getItem(demoCacheKey);
  if (!raw) return generateDemoData("");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : generateDemoData("");
  } catch (error) {
    return generateDemoData("");
  }
};

const generateDemoData = (sessionCode) => {
  const rows = [];
  const now = Date.now();
  for (let i = 0; i < 30; i += 1) {
    const condition = Math.random() < 0.5 ? "A" : "B";
    const baseRt = condition === "A" ? 470 : 520;
    const meanRt = Math.round(baseRt + (Math.random() - 0.5) * 120);
    const accuracy = Math.min(0.98, Math.max(0.7, 0.88 + (Math.random() - 0.5) * 0.12));
    rows.push({
      timestamp_iso: new Date(now - i * 60000).toISOString(),
      session_code: sessionCode,
      participant_id: uuid(),
      condition,
      n_trials: 25,
      n_correct: Math.round(25 * accuracy),
      accuracy,
      mean_rt_correct_excl: meanRt,
      median_rt_correct_excl: meanRt,
      device_type: "phone",
      user_agent: "demo",
    });
  }
  return rows;
};

const ensureDemoSessionData = (sessionCode) => {
  if (!sessionCode) return;
  const rows = loadDemoData();
  const hasSession = rows.some((row) => row.session_code === sessionCode);
  if (hasSession) return;
  const seeded = rows.concat(generateDemoData(sessionCode));
  localStorage.setItem(demoCacheKey, JSON.stringify(seeded));
};

const fetchRows = async (sessionCode) => {
  if (DEMO_MODE) {
    ensureDemoSessionData(sessionCode);
    const rows = loadDemoData();
    return sessionCode
      ? rows.filter((row) => row.session_code === sessionCode)
      : rows;
  }
  const params = new URLSearchParams();
  if (sessionCode) {
    params.set("session_code", sessionCode);
  }
  params.set("limit", "200");
  const response = await fetch(`${ENDPOINT_URL}?${params.toString()}`);
  const data = await response.json();
  return data.rows || [];
};

const refreshClassResults = async () => {
  const sessionCode = state.sessionCode || "";
  const rows = await fetchRows(sessionCode);
  const aggregates = aggregateRows(rows);
  renderResults(aggregates, classResults, distributionChart, interpretation);
};

const refreshDashboardResults = async () => {
  const sessionCode = dashboardSessionInput.value.trim();
  localStorage.setItem("dashboardSessionCode", sessionCode);
  const rows = await fetchRows(sessionCode);
  const aggregates = aggregateRows(rows);
  renderResults(aggregates, dashboardResults, dashboardChart, dashboardInterpretation, true);
};

const aggregateRows = (rows) => {
  const deduped = new Map();
  rows.forEach((row) => {
    if (!row.participant_id) return;
    const existing = deduped.get(row.participant_id);
    if (!existing || new Date(row.timestamp_iso) > new Date(existing.timestamp_iso)) {
      deduped.set(row.participant_id, row);
    }
  });

  const cleaned = Array.from(deduped.values()).filter((row) => row.n_trials >= 10);
  const groups = {
    A: cleaned.filter((row) => row.condition === "A" && row.mean_rt_correct_excl),
    B: cleaned.filter((row) => row.condition === "B" && row.mean_rt_correct_excl),
  };

  const stats = {};
  ["A", "B"].forEach((condition) => {
    const data = groups[condition];
    const rts = data.map((row) => Number(row.mean_rt_correct_excl));
    const accuracies = data.map((row) => Number(row.accuracy));
    stats[condition] = {
      n: data.length,
      meanRt: mean(rts),
      seRt: standardError(rts),
      meanAcc: mean(accuracies) * 100,
      rts,
    };
  });

  const d = cohensD(stats.A.rts, stats.B.rts);

  return {
    total: cleaned.length,
    stats,
    effectSize: d,
  };
};

const renderResults = (aggregates, container, chart, interpretationEl, isDashboard = false) => {
  const { stats, total } = aggregates;
  const aMean = stats.A.meanRt ? `${Math.round(stats.A.meanRt)} ms` : "N/A";
  const bMean = stats.B.meanRt ? `${Math.round(stats.B.meanRt)} ms` : "N/A";
  const aCi = stats.A.seRt ? `${Math.round(stats.A.meanRt - 1.96 * stats.A.seRt)}–${Math.round(stats.A.meanRt + 1.96 * stats.A.seRt)} ms` : "N/A";
  const bCi = stats.B.seRt ? `${Math.round(stats.B.meanRt - 1.96 * stats.B.seRt)}–${Math.round(stats.B.meanRt + 1.96 * stats.B.seRt)} ms` : "N/A";

  container.innerHTML = `
    <p><strong>Total participants:</strong> ${total}</p>
    <p><strong>Condition A (fast):</strong> N=${stats.A.n}, mean RT=${aMean}, 95% CI=${aCi}, mean accuracy=${formatPercent(stats.A.meanAcc)}</p>
    <p><strong>Condition B (accurate):</strong> N=${stats.B.n}, mean RT=${bMean}, 95% CI=${bCi}, mean accuracy=${formatPercent(stats.B.meanAcc)}</p>
    <p><strong>RT effect size (Cohen's d):</strong> ${formatNumber(aggregates.effectSize)}</p>
  `;

  interpretationEl.textContent = "Because assignment was random, group differences can be interpreted causally (with usual caveats).";
  drawHistogram(chart, stats.A.rts, stats.B.rts, isDashboard);
};

const drawHistogram = (canvas, dataA, dataB, big = false) => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const padding = 40;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  const allData = dataA.concat(dataB);
  if (!allData.length) {
    ctx.fillStyle = "#6b7280";
    ctx.fillText("No data yet", padding, padding + 10);
    return;
  }

  const min = Math.min(...allData);
  const max = Math.max(...allData);
  const bins = 8;
  const binSize = (max - min) / bins || 1;

  const hist = (data) => {
    const counts = Array(bins).fill(0);
    data.forEach((value) => {
      const idx = Math.min(bins - 1, Math.floor((value - min) / binSize));
      counts[idx] += 1;
    });
    return counts;
  };

  const countsA = hist(dataA);
  const countsB = hist(dataB);
  const maxCount = Math.max(...countsA, ...countsB, 1);

  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, padding, width, height);

  for (let i = 0; i < bins; i += 1) {
    const x = padding + (i * width) / bins;
    const barWidth = width / bins - 6;
    const heightA = (countsA[i] / maxCount) * height;
    const heightB = (countsB[i] / maxCount) * height;

    ctx.fillStyle = "rgba(37, 99, 235, 0.6)";
    ctx.fillRect(x + 2, padding + height - heightA, barWidth, heightA);
    ctx.fillStyle = "rgba(16, 185, 129, 0.6)";
    ctx.fillRect(x + 2, padding + height - heightB, barWidth, heightB);
  }

  ctx.fillStyle = "#111827";
  ctx.font = big ? "20px sans-serif" : "14px sans-serif";
  ctx.fillText("Mean RT distribution (A=blue, B=green)", padding, padding - 10);
};

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return "N/A";
  return `${value.toFixed(1)}%`;
};

const formatNumber = (value) => {
  if (!Number.isFinite(value)) return "N/A";
  return value.toFixed(2);
};

const mean = (arr) => {
  if (!arr.length) return null;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
};

const median = (arr) => {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
};

const standardDeviation = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
};

const standardError = (arr) => {
  if (arr.length < 2) return null;
  return standardDeviation(arr) / Math.sqrt(arr.length);
};

const cohensD = (arrA, arrB) => {
  if (arrA.length < 2 || arrB.length < 2) return null;
  const meanA = mean(arrA);
  const meanB = mean(arrB);
  const sdA = standardDeviation(arrA);
  const sdB = standardDeviation(arrB);
  const pooled = Math.sqrt(((arrA.length - 1) * sdA ** 2 + (arrB.length - 1) * sdB ** 2) / (arrA.length + arrB.length - 2));
  return pooled ? (meanA - meanB) / pooled : null;
};

const downloadTrialsCsv = () => {
  const header = ["index", "phase", "target", "response", "correct", "rt"].join(",");
  const rows = state.trials.map((t) =>
    [t.index, t.phase, t.target, t.response, t.correct, t.rt].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trials_${state.participantId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

startBtn?.addEventListener("click", () => {
  state.participantId = uuid();
  state.condition = Math.random() < 0.5 ? "A" : "B";
  conditionInstruction.textContent = instructions[state.condition];
  showPanel(setupPanel);
  state.phase = "setup";
  saveState();
});

beginPracticeBtn?.addEventListener("click", () => {
  state.sessionCode = sessionCodeInput.value.trim();
  state.deviceType = deviceTypeInput.value;
  saveState();
  startTask();
});

leftBtn?.addEventListener("click", () => recordResponse("LEFT"));
rightBtn?.addEventListener("click", () => recordResponse("RIGHT"));
runAgainBtn?.addEventListener("click", () => {
  resetState();
  showPanel(landingPanel);
});
refreshResultsBtn?.addEventListener("click", refreshClassResults);
downloadTrialsBtn?.addEventListener("click", downloadTrialsCsv);

if (toggleRefreshBtn) {
  toggleRefreshBtn.addEventListener("click", () => {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
      toggleRefreshBtn.textContent = "Start auto-refresh";
    } else {
      autoRefreshTimer = setInterval(refreshDashboardResults, 5000);
      toggleRefreshBtn.textContent = "Stop auto-refresh";
    }
  });
}

if (dashboardSessionInput) {
  dashboardSessionInput.addEventListener("change", refreshDashboardResults);
}

const initializeApp = () => {
  if (isDashboard()) {
    showPanel(dashboardPanel);
    const storedCode = localStorage.getItem("dashboardSessionCode") || "";
    dashboardSessionInput.value = storedCode;
    refreshDashboardResults();
    autoRefreshTimer = setInterval(refreshDashboardResults, 5000);
    return;
  }

  const hasState = loadState();
  if (hasState && state.phase !== "landing") {
    conditionInstruction.textContent = instructions[state.condition] || "";
    sessionCodeInput.value = state.sessionCode || "";
    deviceTypeInput.value = state.deviceType || "";
    if (state.phase === "setup") {
      showPanel(setupPanel);
    } else if (state.phase === "task") {
      showPanel(taskPanel);
      updateTrialCounter();
      runNextTrial();
    } else if (state.phase === "end") {
      showPanel(endPanel);
      finalizeExperiment();
    }
  } else {
    showPanel(landingPanel);
  }
};

initializeApp();
