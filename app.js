import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ================= FIREBASE ================= */

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

/* ================= USERS ================= */

const userId = document.body.dataset.user; // me | harsh | shashank

/* ================= DATE (4 AM LOGIC) ================= */

function dayKey(offset = 0) {
  const d = new Date();
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  d.setDate(d.getDate() - offset);
  return d.toISOString().split("T")[0];
}

/* ================= RESET ON OPEN ================= */

async function checkDailyReset(uid) {
  const today = dayKey();
  const metaRef = doc(db, "meta", uid);
  const metaSnap = await getDoc(metaRef);

  if (!metaSnap.exists()) {
    await setDoc(metaRef, { day: today });
    return;
  }

  if (metaSnap.data().day === today) return;

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    await setDoc(doc(db, "history", metaSnap.data().day, uid), snap.data());
  }

  await setDoc(userRef, {
    pushups: 0,
    situps: 0,
    squats: 0,
    dips: 0,
    updatedAt: new Date()
  });

  await setDoc(metaRef, { day: today });
  await setDoc(doc(db, "message", "daily"), { text: "" });
}

checkDailyReset(userId);

/* ================= UPDATE DATA (PARTIAL) ================= */

window.updateData = async () => {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data() : {};

  const updated = { ...prev };

  ["pushups", "situps", "squats", "dips"].forEach(f => {
    const el = document.getElementById(f);
    if (el && el.value !== "") {
      updated[f] = Number(el.value);
    }
  });

  updated.updatedAt = new Date();

  await setDoc(ref, updated);
  await setDoc(doc(db, "history", dayKey(), userId), updated);
};

/* ================= UI HELPERS ================= */

function updateToday(prefix, d) {
  ["pushups", "situps", "squats", "dips"].forEach(ex => {
    if (!document.getElementById(prefix + ex)) return;

    const val = d[ex] || 0;
    document.getElementById(prefix + ex).innerText = `${val}/100`;

    const chk = document.getElementById(prefix + ex + "-check");
    if (chk) chk.checked = val >= 100;
  });
}

function updateYesterday(prefix, d) {
  ["pushups", "situps", "squats", "dips"].forEach(ex => {
    if (!document.getElementById(prefix + ex)) return;
    document.getElementById(prefix + ex).innerText = d[ex] ?? 0;
  });
}

/* ================= LISTENERS ================= */

// ME
onSnapshot(doc(db, "users", "me"), snap => {
  if (snap.exists()) updateToday("me-", snap.data());
});
onSnapshot(doc(db, "history", dayKey(1), "me"), snap => {
  if (snap.exists()) updateYesterday("my-y-", snap.data());
});

// HARSH
onSnapshot(doc(db, "users", "harsh"), snap => {
  if (snap.exists()) updateToday("harsh-", snap.data());
});
onSnapshot(doc(db, "history", dayKey(1), "harsh"), snap => {
  if (snap.exists()) updateYesterday("harsh-y-", snap.data());
});

// SHASHANK (SIT-UPS ONLY)
onSnapshot(doc(db, "users", "shashank"), snap => {
  if (!snap.exists()) return;
  const v = snap.data().situps || 0;
  if (document.getElementById("shashank-situps"))
    document.getElementById("shashank-situps").innerText = `${v}/100`;
});
onSnapshot(doc(db, "history", dayKey(1), "shashank"), snap => {
  if (!snap.exists()) return;
  if (document.getElementById("shashank-y-situps"))
    document.getElementById("shashank-y-situps").innerText = snap.data().situps ?? 0;
});

/* ================= MESSAGE ================= */

window.updateMessage = async () => {
  await setDoc(doc(db, "message", "daily"), {
    text: dailyMessage.value
  });
};

onSnapshot(doc(db, "message", "daily"), snap => {
  if (!snap.exists()) return;

  if (document.getElementById("dailyMessage"))
    dailyMessage.value = snap.data().text || "";

  if (document.getElementById("messageView"))
    messageView.innerText = snap.data().text || "";
});
