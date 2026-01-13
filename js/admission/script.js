
// Import the necessary functions from the Firebase SDKs
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
  authDomain: "school-website-66326.firebaseapp.com",
  projectId: "school-website-66326",
  storageBucket: "school-website-66326.appspot.com",
  messagingSenderId: "660829781706",
  appId: "1:660829781706:web:bf447db1d80fc094d9be33"
};

// Initialize Firebase
// This "singleton" pattern prevents re-initializing the app on hot-reloads,
// which is a common source of errors in development.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get instances of the services you need
const auth = getAuth(app);
const db = getFirestore(app);

// Export the initialized services for use in other parts of your app.
// You can then import them in other files like this:
// import { auth, db } from './firebaseConfig';
export { app, auth, db };