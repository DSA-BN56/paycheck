import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3nDecvFnkb0beOT_QR3o5FrS6tWZ3pgs",
  authDomain: "paycheck-7382c.firebaseapp.com",
  projectId: "paycheck-7382c",
  storageBucket: "paycheck-7382c.firebasestorage.app",
  messagingSenderId: "580764201388",
  appId: "1:580764201388:web:8e95ec0dd38d37af308a09"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  console.log("Logged in as", user.email);


  document
    .getElementById("loginButton")
    .addEventListener("click", async () => {

      const email =
        document.getElementById("email").value;

      const password =
        document.getElementById("password").value;

      try {

        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        window.location.href = "dashboard.html";

      } catch (err) {
        alert("Login Failed");
      }

    });