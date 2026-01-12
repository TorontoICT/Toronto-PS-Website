// firebase-config.js

// You must replace this with your actual Firebase project config.
const firebaseConfig = {
    apiKey: "AIzaSyAJlr-6eTCCpQtWHyPics3-tbOS_X5xA84",
    authDomain: "school-website-66326.firebaseapp.com",
    projectId: "school-website-66326",
    storageBucket: "school-website-66326.firebasestorage.app",
    messagingSenderId: "660829781706",
    appId: "1:660829781706:web:bf447db1d80fc094d9be33"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); // make auth available globally

// =========================================================
// === GLOBAL STATE VARIABLES (required by other scripts) ===
let selectedLearnerData = null;
let selectedTeacherData = null;

// Pagination / cursors used by data-functions.js
let PAGE_SIZE = 25; // adjust as needed
let lastVisibleAll = null;
let lastVisibleUnassigned = null;
let lastVisibleAssigned = null;
let lastVisibleTeachers = null;

// Assignment view state
let activeAssignmentView = 'unassigned';

// Export necessary variables for other scripts (assuming a modern module system or global exposure)
// In a non-module setup, these would be accessible globally after this script runs.
// export { db, selectedLearnerData, handleNavigation, showSamsDetails }; (not used for non-module setup)