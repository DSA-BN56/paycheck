import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCL9t51pGmVPTiRsQLSrSe35ZwdglHtXPI",
  authDomain: "sms-speaker-45f37.firebaseapp.com",
  databaseURL: "https://sms-speaker-45f37-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sms-speaker-45f37",
  storageBucket: "sms-speaker-45f37.firebasestorage.app",
  messagingSenderId: "501657520398",
  appId: "1:501657520398:web:98f522df504de369852f5f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document
  .getElementById("loginButton")
  .addEventListener("click", async () => {

    const email =
      document.getElementById("email").value;

    const password =
      document.getElementById("password").value;

    try {

      await setPersistence(auth, browserSessionPersistence);

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      window.location.href = "speaker_dashboard.html";

    } catch (err) {
      alert("Login Failed");
    }

  });