// js/portals/teachers-portal/portfolio-viewer.js

document.addEventListener('DOMContentLoaded', () => {
    // This config must match your main project's config
    const firebaseConfig = {
        apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
        authDomain: "school-website-66326.firebaseapp.com",
        projectId: "school-website-66326",
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const db = firebase.firestore();

    const params = new URLSearchParams(window.location.search);
    const teacherId = params.get('teacherId');

    // **NEW**: Get subject and grade from URL
    const subject = params.get('subject');
    const grade = params.get('grade');

    if (!teacherId || !subject || !grade) {
        document.getElementById('portfolio-items-container').innerHTML = '<p class="status-message error">Error: Missing Teacher ID, Subject, or Grade in the URL.</p>';
        return;
    }

    // Load teacher's name for the cover page first
    loadTeacherName(db, teacherId, subject, grade);

    // Then load the portfolio items
    loadPortfolioForViewing(db, teacherId, subject, grade);

    // Add print button functionality
    const printBtn = document.getElementById('print-page-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }
});

/**
 * Defines the fixed order for portfolio categories.
 */
const PORTFOLIO_CATEGORY_ORDER = [
    "Table Of Content",
    "Job Description",
    "Mission and Vision",
    "School Calender",
    "Personal Time Table",
    "Lesson Plans",
    "Student Assessments",
    "Classroom Management",
    "Teaching Philosophy",
    "Student Work Samples",
    "Professional Development",
    "Parent Communication",
    "Other"
];

/**
 * Loads the teacher's name and portfolio subject/grade for the cover page.
 * @param {firebase.firestore.Firestore} db - The Firestore instance.
 * @param {string} teacherId - The UID of the teacher.
 * @param {string} subject - The subject of the portfolio.
 * @param {string} grade - The grade of the portfolio.
 */
async function loadTeacherName(db, teacherId, subject, grade) {
    const teacherNameEl = document.getElementById('print-cover-teacher-name');
    const subjectGradeEl = document.getElementById('print-cover-subject-grade');

    try {
        const teacherDoc = await db.collection('users').doc(teacherId).get();
        if (teacherDoc.exists) {
            const teacherData = teacherDoc.data();
            const fullName = `${teacherData.preferredName || ''} ${teacherData.surname || ''}`.trim();
            teacherNameEl.textContent = fullName || 'Educator';
            if (subjectGradeEl) {
                subjectGradeEl.textContent = `${subject} - Grade ${grade}`;
            }
        } else {
            teacherNameEl.textContent = 'Unknown Teacher';
        }
    } catch (error) {
        console.error("Error loading teacher name:", error);
        teacherNameEl.textContent = 'Error Loading Name';
    }
}

/**
 * Loads and displays portfolio items for a specific teacher, subject, and grade.
 * @param {firebase.firestore.Firestore} db - The Firestore instance.
 * @param {string} teacherId - The UID of the teacher whose portfolio to load.
 * @param {string} subject - The subject to filter by.
 * @param {string} grade - The grade to filter by.
 */
async function loadPortfolioForViewing(db, teacherId, subject, grade) {
    const container = document.getElementById('portfolio-items-container');
    const lastUpdatedEl = document.getElementById('last-updated-date');
    const dateEl = document.getElementById('print-cover-date');
    container.innerHTML = '<p class="status-message"><i class="fas fa-sync fa-spin"></i> Loading portfolio contents...</p>';

    try {
        // **NEW**: Filter by subject and grade
        const snapshot = await db.collection('teacher_portfolios')
            .where('teacherId', '==', teacherId)
            .where('subject', '==', subject)
            .where('grade', '==', grade)
            .orderBy('uploadedAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="status-message">This portfolio section is currently empty.</p>';
            return;
        }

        // Find the most recent upload date for the "Last Updated" footer
        const mostRecentTimestamp = snapshot.docs[0].data().uploadedAt;
        if (lastUpdatedEl && mostRecentTimestamp) {
            lastUpdatedEl.textContent = mostRecentTimestamp.toDate().toLocaleString();
        }
        if (dateEl) {
            dateEl.textContent = `Portfolio as of: ${new Date().toLocaleDateString()}`;
        }

        const itemsByCategory = {};
        snapshot.forEach(doc => {
            const item = doc.data();
            if (!itemsByCategory[item.category]) {
                itemsByCategory[item.category] = [];
            }
            itemsByCategory[item.category].push(item);
        });

        // Render items in the correct order
        let portfolioHTML = '';
        PORTFOLIO_CATEGORY_ORDER.forEach(category => {
            if (itemsByCategory[category]) {
                portfolioHTML += `<h4 class="portfolio-category-title">${category}</h4><ul class="resource-list">`;
                // Sort items within the category by date as well
                itemsByCategory[category].sort((a, b) => b.uploadedAt.toMillis() - a.uploadedAt.toMillis());
                itemsByCategory[category].forEach(item => {
                    portfolioHTML += `
                        <li>
                            <i class="far fa-file-alt"></i>
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="Uploaded: ${item.uploadedAt.toDate().toLocaleDateString()}">${item.description}</a>
                        </li>`;
                });
                portfolioHTML += `</ul>`;
            }
        });
        container.innerHTML = portfolioHTML;

    } catch (error) {
        console.error("Error loading portfolio:", error);
        container.innerHTML = '<p class="status-message" style="color: red;">Could not load portfolio due to an error.</p>';
        if (error.code === 'failed-precondition') {
            container.innerHTML += '<p class="status-message error" style="font-size: 0.9rem;"><strong>Action Required:</strong> This query requires a database index. Please check the browser console for a link to create it in Firebase.</p>';
        }
    }
}
