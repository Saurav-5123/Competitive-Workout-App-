import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  /* ================= FIREBASE ================= */

  const firebaseConfig = {
    apiKey: "AIzaSyClCmA0XFOjVJDsbrgDa6-LieQnBpsFzpw",
    authDomain: "system-7f5a9.firebaseapp.com",
    projectId: "system-7f5a9"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  /* ================= USER ================= */

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
      await setDoc(
        doc(db, "history", metaSnap.data().day, uid),
        snap.data()
      );
    }

    await setDoc(
      userRef,
      { pushups: 0, situps: 0, squats: 0, dips: 0, updatedAt: new Date() },
      { merge: true }
    );

    await setDoc(metaRef, { day: today });
    await setDoc(doc(db, "message", "daily"), { text: "" });
  }

  checkDailyReset(userId);

  /* ================= UPDATE DATA ================= */

  window.updateData = async () => {
    const data = {};
    let hasUpdate = false;

    ["pushups", "situps", "squats", "dips"].forEach(f => {
      const el = document.getElementById(f);
      if (el && el.value !== "") {
        data[f] = Number(el.value);
        hasUpdate = true;
      }
    });

    if (!hasUpdate) {
      alert("Enter at least one value");
      return;
    }

    data.updatedAt = new Date();

    await setDoc(
      doc(db, "users", userId),
      data,
      { merge: true }
    );

    await setDoc(
      doc(db, "history", dayKey(), userId),
      data,
      { merge: true }
    );
  };

  /* ================= UI HELPERS ================= */

  function updateToday(prefix, d) {
    ["pushups", "situps", "squats", "dips"].forEach(ex => {
      const el = document.getElementById(prefix + ex);
      if (!el) return;

      const val = d[ex] ?? 0;
      el.innerText = `${val}/100`;

      const chk = document.getElementById(prefix + ex + "-check");
      if (chk) chk.checked = val >= 100;
    });
  }

  function updateYesterday(prefix, d) {
    ["pushups", "situps", "squats", "dips"].forEach(ex => {
      const el = document.getElementById(prefix + ex);
      if (el) el.innerText = d[ex] ?? 0;
    });
  }

  /* ================= LISTENERS ================= */

  // SAURAV
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

  // SHASHANK
  onSnapshot(doc(db, "users", "shashank"), snap => {
    if (!snap.exists()) return;
    const el = document.getElementById("shashank-situps");
    if (el) el.innerText = `${snap.data().situps ?? 0}/100`;
  });

  onSnapshot(doc(db, "history", dayKey(1), "shashank"), snap => {
    if (!snap.exists()) return;
    const el = document.getElementById("shashank-y-situps");
    if (el) el.innerText = snap.data().situps ?? 0;
  });

  /* ================= MESSAGE ================= */

  window.updateMessage = async () => {
    const textarea = document.getElementById("dailyMessage");
    if (!textarea || !textarea.value.trim()) return;

    await setDoc(
      doc(db, "message", "daily"),
      { text: textarea.value, updatedAt: new Date() },
      { merge: true }
    );
  };

  onSnapshot(doc(db, "message", "daily"), snap => {
    if (!snap.exists()) return;
    const text = snap.data().text || "";

    const input = document.getElementById("dailyMessage");
    if (input) input.value = text;

    const view = document.getElementById("messageView");
    if (view) view.innerText = text;
  });

});
