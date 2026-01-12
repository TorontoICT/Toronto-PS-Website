// js/portals/teachers-portal/work-output-review.js

/**
 * Initializes the Work Output Review section for the teacher.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's user data.
 */
function initializeWorkOutputReview(db, teacherData) {
    const workOutputSection = document.getElementById('work-output-review');
    if (!workOutputSection) return;

    // Use a MutationObserver to detect when the section becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' && workOutputSection.classList.contains('active-section')) {
                // Only render the form if it hasn't been rendered yet to avoid duplicates
                if (!workOutputSection.dataset.initialized) {
                    renderWorkOutputViewer(db, teacherData);
                    workOutputSection.dataset.initialized = 'true';
                }
            }
        });
    });

    observer.observe(workOutputSection, { attributes: true });
}

/**
 * Renders the filters and container for the work output viewer.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's user data.
 */
function renderWorkOutputViewer(db, teacherData) {
    const contentDiv = document.getElementById('work-output-review');
    const classes = teacherData.assignedClasses || [];
    const subjects = teacherData.assignedSubjects || [];

    if (classes.length === 0 || subjects.length === 0) {
        contentDiv.innerHTML = '<h2>Review Learner Work Outputs</h2><p class="info-message">You are not assigned to any classes or subjects. The work output viewer cannot be loaded.</p>';
        return;
    }

    let filterHTML = `
        <h2>Review Learner Work Outputs</h2>
        <p>Use the filters to review work output submitted by learners.</p>
        <div class="tool-card">
            <div class="work-output-filters" style="display: flex; gap: 15px; align-items: center; margin-bottom: 25px; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; flex-wrap: wrap;">
                <select id="teacher-class-filter" class="filter-select"><option value="">-- Select Class --</option>${classes.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
                <select id="teacher-subject-filter" class="filter-select"><option value="">-- Select Subject --</option>${subjects.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
                <select id="teacher-term-filter" class="filter-select"><option value="">-- Select Term --</option>${[1,2,3,4].map(t => `<option value="${t}">Term ${t}</option>`).join('')}</select>
                <select id="teacher-week-filter" class="filter-select" disabled><option value="">-- Select Week --</option></select>
            </div>
            <div id="teacher-history-table-container"></div>
        </div>
    `;
    contentDiv.innerHTML = filterHTML;

    const classFilter = document.getElementById('teacher-class-filter');
    const subjectFilter = document.getElementById('teacher-subject-filter');
    const termFilter = document.getElementById('teacher-term-filter');
    const weekFilter = document.getElementById('teacher-week-filter');

    termFilter.addEventListener('change', () => {
        weekFilter.disabled = true;
        weekFilter.innerHTML = '<option value="">-- Select Week --</option>';
        if (termFilter.value) {
            for (let i = 1; i <= 10; i++) { weekFilter.add(new Option(`Week ${i}`, i)); }
            weekFilter.disabled = false;
        }
        fetchAndDisplaySubmissions();
    });

    classFilter.addEventListener('change', fetchAndDisplaySubmissions);
    subjectFilter.addEventListener('change', fetchAndDisplaySubmissions);
    weekFilter.addEventListener('change', fetchAndDisplaySubmissions);

    async function fetchAndDisplaySubmissions() {
        const tableContainer = document.getElementById('teacher-history-table-container');
        const selectedClass = classFilter.value;
        const subject = subjectFilter.value;
        const term = termFilter.value;
        const week = weekFilter.value;

        if (!selectedClass || !subject || !term || !week) {
            tableContainer.innerHTML = '<p class="info-message">Please select a class, subject, term, and week to view submissions.</p>';
            return;
        }

        tableContainer.innerHTML = '<p class="info-message">Loading submissions...</p>';

        try {
            const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', selectedClass).get();
            const allLearners = new Map();
            learnersSnapshot.docs.forEach(doc => allLearners.set(doc.id, doc.data()));
 
            if (allLearners.size === 0) {
                tableContainer.innerHTML = `<p class="info-message">No learners found for class ${selectedClass}.</p>`;
                return;
            }

            const learnerAuthIds = Array.from(allLearners.values()).map(learner => learner.parentUserId).filter(Boolean);
            const queryPromises = [];
            if (learnerAuthIds.length > 0) {
                for (let i = 0; i < learnerAuthIds.length; i += 30) { // Increased batch size to 30
                    const chunk = learnerAuthIds.slice(i, i + 10);
                    const query = db.collection('work_outputs')
                        .where('learnerId', 'in', chunk)
                        .where('term', '==', Number(term))
                        .where('week', '==', Number(week))
                        .where('subject', '>=', subject)
                        .where('subject', '<', subject + '\uf8ff');
                    queryPromises.push(query.get());
                }
            }

            const querySnapshots = await Promise.all(queryPromises);
            const submissions = new Map();
            querySnapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => submissions.set(doc.data().learnerId, doc.data()));
            });

            const sortedLearners = Array.from(allLearners.values()).sort((a, b) => {
                const nameA = `${a.learnerSurname || ''} ${a.learnerName || ''}`.trim();
                const nameB = `${b.learnerSurname || ''} ${b.learnerName || ''}`.trim();
                return nameA.localeCompare(nameB);
            });

            let tableHTML = `
                <table class="data-table">
                    <thead><tr><th>Learner Name</th><th>Status</th><th>Class Activities</th><th>Home Activities</th><th>File</th><th>Submitted On</th></tr></thead>
                    <tbody>
            `;

            sortedLearners.forEach(learner => {
                const submissionData = learner.parentUserId ? submissions.get(learner.parentUserId) : undefined;
                const learnerName = `${learner.learnerSurname || ''} ${learner.learnerName || ''}`.trim();

                if (submissionData) {
                    const date = submissionData.updatedAt ? submissionData.updatedAt.toDate().toLocaleDateString() : 'N/A';
                    const fileLink = submissionData.fileName ? `<a href="${submissionData.fileUrl}" target="_blank" class="cta-button-small">View File</a>` : 'None';
                    tableHTML += `
                        <tr class="submission-row-submitted">
                            <td>${learnerName}</td>
                            <td><span class="status-badge status-submitted">Submitted</span></td>
                            <td class="topics-cell"><b>Count:</b> ${submissionData.classActivitiesCount || 0}<br><b>Topics:</b> ${submissionData.classTopics || '-'}</td>
                            <td class="topics-cell"><b>Count:</b> ${submissionData.homeActivitiesCount || 0}<br><b>Topics:</b> ${submissionData.homeTopics || '-'}</td>
                            <td>${fileLink}</td>
                            <td>${date}</td>
                        </tr>`;
                } else {
                    tableHTML += `
                        <tr class="submission-row-missing">
                            <td>${learnerName}</td>
                            <td><span class="status-badge status-missing">Not Submitted</span></td>
                            <td>-</td><td>-</td><td>-</td><td>-</td>
                        </tr>`;
                }
            });

            tableHTML += `</tbody></table>`;
            tableContainer.innerHTML = tableHTML;

        } catch (error) {
            console.error("Error fetching work output submissions:", error);
            tableContainer.innerHTML = '<p class="error-message">Could not load submissions. Please try again.</p>';
        }
    }
}