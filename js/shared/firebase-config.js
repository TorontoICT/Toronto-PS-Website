// Shared Firebase config (compat SDK) - used by portal scripts that rely on compat APIs.
// Place this file before any portal scripts that access `firebase`, `db`, or `auth`.
const firebaseConfig = {
  apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
  authDomain: "school-website-66326.firebaseapp.com",
  projectId: "school-website-66326",
  storageBucket: "school-website-66326.firebasestorage.app",
  messagingSenderId: "660829781706",
  appId: "1:660829781706:web:bf447db1d80fc094d9be33"
};

if (!window.firebase) {
  console.warn('Firebase not loaded. Ensure the compat SDK scripts are included before this file.');
} else {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
}

// Create commonly used globals for convenience (compat SDK)
const db = (window.firebase && firebase.firestore) ? firebase.firestore() : null;
const auth = (window.firebase && firebase.auth) ? firebase.auth() : null;
const storage = (window.firebase && firebase.storage) ? firebase.storage() : null;

// expose on window for legacy scripts that expect globals
window.firebaseConfig = firebaseConfig;
window.db = db;
window.auth = auth;
window.firebaseStorage = storage;
