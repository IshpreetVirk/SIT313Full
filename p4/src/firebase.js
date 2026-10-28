import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDKz3sW_ysREmCoxhO5fRC5TytdEX0NfR8",
  authDomain: "kingsmaning.firebaseapp.com",
  projectId: "kingsmaning",
  storageBucket: "kingsmaning.firebasestorage.app",
  messagingSenderId: "821811385709",
  appId: "1:821811385709:web:24e97f41587c7c45bb3664",
  measurementId: "G-B6V1C30C5F"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
