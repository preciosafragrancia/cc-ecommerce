
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBVvH85IOTo7mebY0RnH3c8EvfFOln066I",
  authDomain: "cc-preciosa-fragrancia.firebaseapp.com",
  projectId: "cc-preciosa-fragrancia",
  storageBucket: "cc-preciosa-fragrancia.firebasestorage.app",
  messagingSenderId: "727949689496",
  appId: "1:727949689496:web:14f153427bd9f9142306ed" 
};
// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Exportar o serviço de autenticação
export const auth = getAuth(app);

// Inicializar o Firestore
export const db = getFirestore(app);

// Inicializar Analytics somente no navegador para evitar erros em SSR
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
