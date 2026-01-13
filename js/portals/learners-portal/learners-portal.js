// js/portals/learners-portal/learners-portal.js

import { displayOfficialSchoolCalendar } from '../parents-portal/calendar-display.js';
import { setupNavigation, setupResponsiveSidebar } from './navigation.js';
import { initializeProfileSection } from './profile.js';
import { setupAcademicsSection } from './subjects.js';
import { setupWorkOutputSection } from './work-output.js';
document.addEventListener('DOMContentLoaded', () => {
    // Firebase config moved to js/shared/firebase-config.js
    const db = firebase.firestore();

    const userData = JSON.parse(sessionStorage.getItem('currentUser'));

    if (userData) {
        // Initialize the portal
        initializeLearnerPortal(db, userData);
    } else { 
        console.error("No user data found in session.");
        // window.location.href = '../../html/auth/auth.html';
    }
});

/**
 * Main function to set up the learner portal.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} userData - The authenticated user's data.
 */
async function initializeLearnerPortal(db, userData) {
    const learnerNameDisplay = document.getElementById('learner-name-display');
    if (learnerNameDisplay) {
        learnerNameDisplay.textContent = userData.learnerName || 'Learner';
    }

    setupNavigation();
    setupResponsiveSidebar();
    
    if (!userData.samsRegistrationId) {
        console.error("Learner's SAMS registration link is missing.");
        return;
    }

    try {
        const learnerDoc = await db.collection('sams_registrations').doc(userData.samsRegistrationId).get();
        if (!learnerDoc.exists) {
            console.error("Could not find the full learner record in sams_registrations.");
            return;
        }
        const fullLearnerData = learnerDoc.data();

        // --- Populate Dashboard Section ---
        populateDashboardCards(db, learnerDoc.id, fullLearnerData);

        // Initialize each section with the necessary data
        initializeProfileSection(db, userData, fullLearnerData);
        setupAcademicsSection(db, userData, fullLearnerData);
        setupWorkOutputSection(db, userData, fullLearnerData);
        
        // Initialize calendar display logic
        setupCalendarInitialization(db);

    } catch (error) {
        console.error("Error fetching full learner data:", error);
    }
}

/**
 * Sets up the trigger for initializing the calendar view.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function setupCalendarInitialization(db) {
    const showCalendar = () => {
        if (window.location.hash === '#school-calendar') {
            displayOfficialSchoolCalendar(db, 'learner-official-calendar-container');
        }
    };

    // Listen for hash changes to show the calendar
    window.addEventListener('hashchange', showCalendar);

    // Also check on initial load
    showCalendar();
}

/**
 * Fetches data for and populates the dashboard summary cards.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} learnerId - The learner's document ID from sams_registrations.
 * @param {object} learnerData - The full data object for the learner.
 */
async function populateDashboardCards(db, learnerId, learnerData) {
    const notificationsCard = document.getElementById('dashboard-notifications');
    const assignmentsCard = document.getElementById('dashboard-assignments');
    const gradeCard = document.getElementById('dashboard-latest-grade');

    // 1. Fetch Announcements (for notifications)
    try {
        const announcementsSnapshot = await db.collection('announcements').orderBy('date', 'desc').limit(1).get();
        if (!announcementsSnapshot.empty) {
            notificationsCard.textContent = `New: "${announcementsSnapshot.docs[0].data().title}"`;
        } else {
            notificationsCard.textContent = 'No new announcements.';
        }
    } catch (e) {
        notificationsCard.textContent = 'Could not load alerts.';
    }

    // 2. Fetch Grades to calculate average
    try {
        const gradesSnapshot = await db.collection('grades').where('learnerId', '==', learnerId).get();
        if (!gradesSnapshot.empty) {
            let totalScore = 0;
            gradesSnapshot.forEach(doc => { totalScore += doc.data().score; });
            const average = totalScore / gradesSnapshot.size;
            gradeCard.textContent = `${average.toFixed(1)}%`;
        } else {
            gradeCard.textContent = 'No grades recorded yet.';
        }
    } catch (e) {
        gradeCard.textContent = 'Could not load grades.';
    }

    // 3. Placeholder for assignments
    assignmentsCard.textContent = 'Maths worksheet due Friday.';
}