import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ---------------- FIREBASE CONFIG ---------------- */

const firebaseConfig = {
  apiKey: "AIzaSyClCmA0XFOjVJDsbrgDa6-LieQnBpsFzpw",
  authDomain: "system-7f5a9.firebaseapp.com",
  projectId: "system-7f5a9",
  storageBucket: "system-7f5a9.firebasestorage.app",
  messagingSenderId: "779071766430",
  appId: "1:779071766430:web:35af20b0608cb77368a08f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------------- USERS ---------------- */

const userId = document.body.dataset.user; // "me" or "friend"
const friendId = userId === "me" ? "friend" : "me";

/* ---------------- DATE HELPERS ---------------- */

// Returns the logical "day key" based on 4 AM reset
function getResetDayKey(offset = 0) {
  const now = new Date();

  // If before 4 AM, still count as previous day
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }

  now.setDate(now.getDate() - offset);
  return now.toISOString().split("T")[0];
}

/* ---------------- RESET ON OPEN ---------------- */

async function checkDailyReset(uid) {
  const todayKey = getResetDayKey();
  const metaRef = doc(db, "meta", uid);
  const metaSnap = await getDoc(metaRef);

  // First time ever
  if (!metaSnap.exists()) {
    await setDoc(metaRef, { lastDay: todayKey });
    return;
  }

  const lastDay = metaSnap.data().lastDay;

  // Same logical day → nothing to do
  if (lastDay === todayKey) return;

  // New day detected → move data to history & reset
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Save yesterday
    await setDoc(
      doc(db, "history", lastDay, uid),
      userSnap.data()
    );

    // Reset today
    await setDoc(userRef, {
      pushups: 0,
      situps: 0,
      squats: 0,
      dips: 0,
      updatedAt: new Date()
    });
  }

  // Update meta
  await setDoc(metaRef, { lastDay: todayKey });
}

/* ---------------- UPDATE DATA ---------------- */

window.updateData = async () => {
  const data = {
    pushups: +pushups.value || 0,
    situps: +situps.value || 0,
    squats: +squats.value || 0,
    dips: +dips.value || 0,
    updatedAt: new Date()
  };

  await setDoc(doc(db, "users", userId), data);
  await setDoc(doc(db, "history", getResetDayKey(), userId), data);
};

/* ---------------- UI HELPERS ---------------- */

function updateUI(prefix, d) {
  ["pushups", "situps", "squats", "dips"].forEach(ex => {
    const value = d[ex] || 0;
    document.getElementById(prefix + ex).innerText = `${value}/100`;

    const chk = document.getElementById(prefix + ex + "-check");
    if (chk) chk.checked = value >= 100;
  });
}

/* ---------------- LISTENERS ---------------- */

function listenToday(id, prefix) {
  onSnapshot(doc(db, "users", id), snap => {
    if (snap.exists()) {
      updateUI(prefix, snap.data());
    }
  });
}

function listenYesterday(id, prefix) {
  onSnapshot(doc(db, "history", getResetDayKey(1), id), snap => {
    if (!snap.exists()) return;
    const d = snap.data();

    document.getElementById(prefix + "pushups").innerText = d.pushups ?? 0;
    document.getElementById(prefix + "situps").innerText = d.situps ?? 0;
    document.getElementById(prefix + "squats").innerText = d.squats ?? 0;
    document.getElementById(prefix + "dips").innerText = d.dips ?? 0;
  });
}

/* ---------------- INIT ---------------- */

// Reset check (runs once on page load)
checkDailyReset(userId);

// Live listeners
listenToday(userId, "me-");
listenToday(friendId, "fr-");

listenYesterday(userId, "my-y-");
listenYesterday(friendId, "fr-y-");
