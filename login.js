import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { firebaseConfig }
  from "./firebasesConfig.js";


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