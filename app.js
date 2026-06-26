import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";


import { firebaseConfig }
  from "./firebasesConfig.js";


let appState = {
  transactions: [],
  searchQuery: "",
  sortBy: "time-desc",
  dateRange: "3",
  autoSpeak: false,
  refreshIntervalId: null,
  activeSpeechUtterance: null,
  spokenTxnIds: new Set()
};

const AVATAR_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ec4899", "#06b6d4", "#f43f5e", "#14b8a6"
];

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  setupEventListeners();
  initSpeechSynthesis();
});

document
  .getElementById("refresh-btn")
  .addEventListener("click", async () => {
    const btn = document.getElementById("refresh-btn");
    btn.disabled = true;

  });

function loadSettings() {
  const savedAutoSpeak = localStorage.getItem("auto_speak_enabled");
  const savedVoiceName = localStorage.getItem("speech_voice_name");

  if (savedAutoSpeak === "true") {
    appState.autoSpeak = true;
    document.getElementById("auto-speak-toggle").checked = true;
  }
  if (savedVoiceName) {
    appState.savedVoiceName = savedVoiceName;
  }
}

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, "messages");
onValue(messagesRef, (snapshot) => {
  updateConnectionStatus("connected", "Live");
  hideWarningBanner();
  const data = snapshot.val();

  const transactionList = processFirebaseData(data);

  const previousTxnIds =
    new Set(appState.transactions.map(t => t.id));

  appState.transactions = transactionList;

  updateMetrics();
  renderTransactions();

  if (appState.autoSpeak && previousTxnIds.size > 0) {
    speakNewTransactions(transactionList, previousTxnIds);
  }

},
  (error) => {

    console.error(error);

    updateConnectionStatus("disconnected", "Offline");

    showWarningBanner();

  }
);






function processFirebaseData(rawData) {
  if (!rawData) return [];
  return Object.keys(rawData).map(key => {
    const item = rawData[key];
    let amountVal = 0;
    if (item.amount) {
      amountVal = parseFloat(String(item.amount).replace(/,/g, "")) || 0;
    }
    return {
      id: key,
      creditor: item.creditor || "Unknown",
      amount: amountVal,
      dateTime: item.dateTime || "Unknown Date",
      speakText: item.speakText || `${item.creditor} credited Rs.${item.amount}`,
      text: item.text || `${item.creditor} credited Rs.${item.amount} On ${item.dateTime}`,
      timestamp: item.timestamp ? parseInt(item.timestamp) : 0
    };
  });
}

function initSpeechSynthesis() {
  if (!('speechSynthesis' in window)) return;
  const populateVoices = () => {
    appState.voices = window.speechSynthesis.getVoices();
    const select = document.getElementById("voice-select");
    select.innerHTML = '<option value="">Default System Voice</option>';
    appState.voices.forEach(voice => {
      const opt = document.createElement("option");
      opt.value = voice.name;
      opt.textContent = `${voice.name} (${voice.lang})`;
      if (appState.savedVoiceName && voice.name === appState.savedVoiceName) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  };
  populateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }
  document.getElementById("voice-select").addEventListener("change", (e) => {
    localStorage.setItem("speech_voice_name", e.target.value);
  });
}

function speakTransaction(transaction) {
  if (!('speechSynthesis' in window)) return;
  stopSpeaking();

  const text = transaction.speakText || transaction.text;
  const utterance = new SpeechSynthesisUtterance(text);

  const selectedVoiceName = document.getElementById("voice-select").value;
  if (selectedVoiceName && appState.voices) {
    const voice = appState.voices.find(v => v.name === selectedVoiceName);
    if (voice) utterance.voice = voice;
  }

  utterance.onstart = () => {
    appState.activeSpeechUtterance = utterance;
    const cardEl = document.querySelector(`[data-id="${transaction.id}"]`);
    if (cardEl) {
      cardEl.classList.add("speaking-glow");
      const ind = cardEl.querySelector(".speak-status-indicator");
      if (ind) {
        ind.classList.add("spoken-active");
        ind.querySelector("span").textContent = "Speaking...";
      }
    }
    document.getElementById("speech-bar").classList.remove("hidden");
    document.getElementById("speech-text-content").textContent = text;
  };

  utterance.onend = utterance.onerror = () => {
    appState.activeSpeechUtterance = null;
    const cardEl = document.querySelector(`[data-id="${transaction.id}"]`);
    if (cardEl) {
      cardEl.classList.remove("speaking-glow");
      const ind = cardEl.querySelector(".speak-status-indicator");
      if (ind) {
        ind.classList.remove("spoken-active");
        ind.querySelector("span").textContent = "Played";
      }
    }
    appState.spokenTxnIds.add(transaction.id);
    document.getElementById("speech-bar").classList.add("hidden");
  };

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    document.querySelectorAll(".transaction-card").forEach(card => {
      card.classList.remove("speaking-glow");
      const ind = card.querySelector(".speak-status-indicator");
      if (ind) {
        ind.classList.remove("spoken-active");
        ind.querySelector("span").textContent = appState.spokenTxnIds.has(card.dataset.id) ? "Played" : "Ready";
      }
    });
    document.getElementById("speech-bar").classList.add("hidden");
    appState.activeSpeechUtterance = null;
  }
}

function speakNewTransactions(allTransactions, previousIds) {
  const newTxns = allTransactions.filter(t => !previousIds.has(t.id) && !appState.spokenTxnIds.has(t.id));
  if (newTxns.length > 0) {
    newTxns.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    let idx = 0;
    const speakNext = () => {
      if (idx < newTxns.length && appState.autoSpeak) {
        const txn = newTxns[idx++];
        appState.spokenTxnIds.add(txn.id);
        const text = txn.speakText || txn.text;
        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoiceName = document.getElementById("voice-select").value;
        if (selectedVoiceName && appState.voices) {
          const voice = appState.voices.find(v => v.name === selectedVoiceName);
          if (voice) utterance.voice = voice;
        }
        utterance.onstart = () => {
          document.getElementById("speech-bar").classList.remove("hidden");
          document.getElementById("speech-text-content").textContent = text;
          const cardEl = document.querySelector(`[data-id="${txn.id}"]`);
          if (cardEl) {
            cardEl.classList.add("speaking-glow");
            const ind = cardEl.querySelector(".speak-status-indicator");
            if (ind) {
              ind.classList.add("spoken-active");
              ind.querySelector("span").textContent = "Speaking...";
            }
          }
        };
        utterance.onend = utterance.onerror = () => {
          const cardEl = document.querySelector(`[data-id="${txn.id}"]`);
          if (cardEl) {
            cardEl.classList.remove("speaking-glow");
            const ind = cardEl.querySelector(".speak-status-indicator");
            if (ind) {
              ind.classList.remove("spoken-active");
              ind.querySelector("span").textContent = "Played";
            }
          }
          document.getElementById("speech-bar").classList.add("hidden");
          speakNext();
        };
        window.speechSynthesis.speak(utterance);
      }
    };
    speakNext();
  }
}

// Returns transactions filtered by the active date range pill
function getDateFilteredTransactions() {
  const range = appState.dateRange;
  if (range === "all") return appState.transactions;

  const now = Date.now();
  let cutoff;
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    cutoff = d.getTime();
  } else {
    const days = parseInt(range);
    cutoff = now - days * 24 * 60 * 60 * 1000;
  }

  return appState.transactions.filter(t => t.timestamp >= cutoff);
}

function updateMetrics() {
  const totalAmountEl = document.getElementById("stat-total-amount");
  const totalCountEl = document.getElementById("stat-total-count");
  const totalCreditorsEl = document.getElementById("stat-total-creditors");
  const dateFiltered = getDateFilteredTransactions();
  const totalVolume = dateFiltered.reduce((acc, t) => acc + t.amount, 0);
  const creditorsSet = new Set(dateFiltered.map(t => t.creditor.toLowerCase()));
  animateNumericValue(totalAmountEl, totalVolume, true);
  animateNumericValue(totalCountEl, dateFiltered.length, false);
  animateNumericValue(totalCreditorsEl, creditorsSet.size, false);
}

function animateNumericValue(element, targetVal, isCurrency) {
  let currentVal = 0;
  const totalFrames = 48;
  const increment = targetVal / totalFrames;
  let frame = 0;
  const timer = setInterval(() => {
    frame++;
    currentVal += increment;
    if (frame >= totalFrames) {
      clearInterval(timer);
      currentVal = targetVal;
    }
    if (isCurrency) {
      element.textContent = new Intl.NumberFormat("en-IN", {
        style: "currency", currency: "INR", maximumFractionDigits: 0
      }).format(currentVal);
    } else {
      element.textContent = Math.round(currentVal).toLocaleString();
    }
  }, 16);
}

function renderTransactions() {
  const container = document.getElementById("transactions-container");
  container.innerHTML = "";

  // Step 1: apply date range filter
  let filtered = getDateFilteredTransactions();

  // Step 2: apply search query on top of date-filtered results
  if (appState.searchQuery) {
    const query = appState.searchQuery.toLowerCase();
    filtered = filtered.filter(txn =>
      txn.creditor.toLowerCase().includes(query) ||
      String(txn.amount).includes(query) ||
      txn.text.toLowerCase().includes(query)
    );
  }

  filtered.sort((a, b) => {
    switch (appState.sortBy) {
      case "time-asc": return a.timestamp - b.timestamp || a.id.localeCompare(b.id);
      case "amount-desc": return b.amount - a.amount;
      case "amount-asc": return a.amount - b.amount;
      case "time-desc":
      default: return b.timestamp - a.timestamp || b.id.localeCompare(a.id);
    }
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>No Transactions Found</h3></div>`;
    return;
  }

  filtered.forEach(txn => {
    const card = document.createElement("div");
    card.className = "transaction-card glass";
    card.dataset.id = txn.id;
    const avatarColor = getAvatarColor(txn.creditor);
    const firstChar = txn.creditor.charAt(0);
    const isSpoken = appState.spokenTxnIds.has(txn.id);

    card.innerHTML = `
      <div class="card-header">
        <div class="creditor-profile">
          <div class="avatar" style="background-color: ${avatarColor}">${firstChar}</div>
          <div class="profile-info">
            <span class="creditor-name">${txn.creditor}</span>
            <span class="txn-time">${txn.dateTime}</span>
          </div>
        </div>
        <div class="speak-status-indicator ${isSpoken ? "spoken-active" : ""}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/></svg>
          <span>${isSpoken ? "Played" : "Ready"}</span>
        </div>
      </div>
      <div class="card-amount-area">
        <span class="amount-label">Amount:</span>
        <span class="amount-value">₹${txn.amount.toLocaleString("en-IN")}</span>
      </div>
      <div class="sms-display-bubble">
        <p class="sms-text">${txn.text}</p>
      </div>
      <div class="card-footer">
        <div class="card-actions-group">
          <button class="mini-action-btn speak-card-btn">Speak</button>
          <button class="mini-action-btn copy-card-btn">Copy</button>
        </div>
      </div>
    `;

    card.querySelector(".speak-card-btn").addEventListener("click", () => speakTransaction(txn));
    card.querySelector(".copy-card-btn").addEventListener("click", () => copyToClipboard(txn.text));
    container.appendChild(card);
  });
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function setupEventListeners() {
  document.getElementById("search-input").addEventListener("input", e => { appState.searchQuery = e.target.value; renderTransactions(); });
  document.getElementById("sort-select").addEventListener("change", e => { appState.sortBy = e.target.value; renderTransactions(); });

  // Date range pill buttons
  document.querySelectorAll(".date-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".date-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      appState.dateRange = pill.dataset.range;
      updateMetrics();
      renderTransactions();
    });
  });
  document.getElementById("auto-speak-toggle").addEventListener("change", e => {
    appState.autoSpeak = e.target.checked;
    localStorage.setItem("auto_speak_enabled", e.target.checked);
  });

  document.getElementById("speech-stop-btn").addEventListener("click", stopSpeaking);
}



function updateConnectionStatus(state, labelText) {
  const badge = document.getElementById("connection-status");
  badge.className = `status-badge status-${state}`;
  badge.querySelector(".status-label").textContent = labelText;
}

function showWarningBanner() {
  document.getElementById("connection-warning").classList.remove("hidden");
  document.getElementById("transactions-container").innerHTML = "";
}

function hideWarningBanner() {
  document.getElementById("connection-warning").classList.add("hidden");
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast("SMS copied!", "success"))
    .catch(() => showToast("Copy failed", "error"));
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.className = `toast-container toast-${type} show`;
  toast.textContent = message;
  setTimeout(() => toast.classList.remove("show"), 3000);
}