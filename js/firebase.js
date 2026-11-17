
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

/* CONFIGURAÇÃO FIREBASE */

const firebaseConfig = {
  apiKey: "AIzaSyCjBar-is1b9vqeaTfaGkICeojtNF0z1cw",
  authDomain: "produtiva-89d7d.firebaseapp.com",
  projectId: "produtiva-89d7d",
  storageBucket: "produtiva-89d7d.firebasestorage.app",
  messagingSenderId: "237663641410",
  appId: "1:237663641410:web:28704ab8560c98922272db"
};

/* INICIALIZAR FIREBASE */

const app = initializeApp(firebaseConfig);

/* AUTENTICAÇÃO */

const auth = getAuth(app);

/* FIRESTORE */

const db = getFirestore(app);

/* EXPORTAR */

export { app, auth, db };
