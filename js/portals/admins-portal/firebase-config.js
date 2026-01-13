// firebase-config.js

// Firebase initialization moved to js/shared/firebase-config.js
// Ensure that `js/shared/firebase-config.js` is included before these portal scripts.
const db = (window.db) ? window.db : (window.firebase && firebase.firestore ? firebase.firestore() : null);
const auth = (window.auth) ? window.auth : (window.firebase && firebase.auth ? firebase.auth() : null); // make auth available globally

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