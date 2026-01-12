// js/portals/admins-portal/report-card-generator.js

/**
 * Initializes the report card generation tool.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
async function setupReportCardGenerator(db) {
    const classSelect = document.getElementById('report-card-class-filter');
    const learnerSelect = document.getElementById('report-card-learner-filter');
    const generateBtn = document.getElementById('generate-report-card-btn');
    const reportCardContainer = document.getElementById('report-card-preview-container');

    if (!classSelect || !learnerSelect || !generateBtn) return;

    // Populate class dropdown
    try {
        const classesSnapshot = await db.collection('sams_registrations').get();
        const uniqueClasses = new Set();
        classesSnapshot.forEach(doc => {
            if (doc.data().fullGradeSection) {
                uniqueClasses.add(doc.data().fullGradeSection);
            }
        });
        classSelect.innerHTML = '<option value="">-- Select a Class --</option>';
        Array.from(uniqueClasses).sort().forEach(className => {
            classSelect.add(new Option(className, className));
        });
    } catch (error) {
        console.error("Error loading classes for report card generator:", error);
    }

    // When a class is selected, populate the learner dropdown
    classSelect.addEventListener('change', async () => {
        const selectedClass = classSelect.value;
        learnerSelect.innerHTML = '<option value="">-- Loading Learners... --</option>';
        learnerSelect.disabled = true;
        reportCardContainer.innerHTML = '';

        if (!selectedClass) {
            learnerSelect.innerHTML = '<option value="">-- Select Class First --</option>';
            return;
        }

        const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', selectedClass).get();
        const learners = learnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        sortLearnersByName(learners);

        learnerSelect.innerHTML = '<option value="">-- Select a Learner --</option>';
        learners.forEach(learner => {
            learnerSelect.add(new Option(formatLearnerName(learner), learner.id));
        });
        learnerSelect.disabled = false;
    });

    // When the generate button is clicked
    generateBtn.addEventListener('click', () => {
        const learnerId = learnerSelect.value;
        const term = document.getElementById('report-card-term-filter').value;
        const year = document.getElementById('report-card-year-filter').value;

        if (!learnerId || !term || !year) {
            alert('Please select a class, learner, term, and year.');
            return;
        }

        generateAndDisplayReportCard(db, learnerId, term, year);
    });
}

/**
 * Fetches all necessary data and generates the report card.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} learnerId - The document ID of the learner.
 * @param {string} term - The academic term (e.g., "1").
 * @param {string} year - The academic year (e.g., "2024").
 */
async function generateAndDisplayReportCard(db, learnerId, term, year) {
    const container = document.getElementById('report-card-preview-container');
    container.innerHTML = '<p class="data-status-message"><i class="fas fa-sync fa-spin"></i> Generating report card...</p>';

    try {
        // 1. Fetch Learner Data
        const learnerDoc = await db.collection('sams_registrations').doc(learnerId).get();
        if (!learnerDoc.exists) throw new Error('Learner not found.');
        const learnerData = learnerDoc.data();

        // 2. Fetch Grades for all subjects for the learner
        const gradesSnapshot = await db.collection('grades').where('learnerId', '==', learnerId).get();
        const gradesBySubject = {};
        gradesSnapshot.forEach(doc => {
            const grade = doc.data();
            if (!gradesBySubject[grade.subject]) {
                gradesBySubject[grade.subject] = [];
            }
            gradesBySubject[grade.subject].push(grade.score);
        });

        // 3. Fetch Behavioral Comments
        const commentsSnapshot = await db.collection('sams_registrations').doc(learnerId).collection('behavioral_comments').get();
        const comments = commentsSnapshot.docs.map(doc => doc.data());

        // 4. Fetch Attendance (simplified for this example)
        // In a real scenario, you'd query the weekly_attendance for the term's weeks.
        const attendance = { daysPresent: 60, daysAbsent: 2 }; // Placeholder

        // 5. Assemble the report card data object
        const reportCardData = {
            learnerName: formatLearnerName(learnerData),
            admissionId: learnerData.admissionId,
            grade: learnerData.fullGradeSection,
            term,
            year,
            subjects: Object.entries(gradesBySubject).map(([subject, scores]) => {
                const total = scores.reduce((sum, score) => sum + score, 0);
                const average = scores.length > 0 ? (total / scores.length).toFixed(1) : 'N/A';
                return { subject, average, comment: "Good progress." }; // Placeholder comment
            }),
            principalComment: "A satisfactory term. Keep up the good work.", // Placeholder
            teacherComment: "Shows enthusiasm in class.", // Placeholder
            attendance,
            generatedAt: new Date().toISOString()
        };

        // 6. Render the report card preview
        renderReportCard(container, reportCardData);

        // 7. Save the generated report to Firestore
        const reportCardId = `${year}-Term${term}`;
        await db.collection('sams_registrations').doc(learnerId).collection('report_cards').doc(reportCardId).set(reportCardData);

        const status = document.createElement('p');
        status.className = 'status-message-box success';
        status.textContent = `Report card for Term ${term}, ${year} generated and saved successfully!`;
        container.appendChild(status);

    } catch (error) {
        console.error("Error generating report card:", error);
        container.innerHTML = `<p class="data-status-message error">Failed to generate report card. ${error.message}</p>`;
    }
}

/**
 * Renders the HTML for the report card preview.
 * @param {HTMLElement} container - The container to render the report card into.
 * @param {object} data - The assembled report card data.
 */
function renderReportCard(container, data) {
    let subjectsHTML = data.subjects.map(sub => `
        <tr>
            <td>${sub.subject}</td>
            <td>${sub.average}%</td>
            <td>${getAchievementLevel(sub.average).level}</td>
            <td>${getAchievementLevel(sub.average).description}</td>
            <td>${sub.comment}</td>
        </tr>
    `).join('');

    const reportHTML = `
        <div class="report-card-header">
            <img src="../../images/Logo.png" alt="School Logo" class="school-logo">
            <h1>Toronto Primary School</h1>
            <h2>Learner Progress Report</h2>
        </div>
        <div class="report-card-learner-info">
            <div><strong>Learner:</strong> ${data.learnerName}</div>
            <div><strong>Admission No:</strong> ${data.admissionId}</div>
            <div><strong>Grade:</strong> ${data.grade}</div>
            <div><strong>Term:</strong> ${data.term}, ${data.year}</div>
        </div>

        <h3>Academic Performance</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Term Mark (%)</th>
                    <th>Level</th>
                    <th>Descriptor</th>
                    <th>Educator's Comment</th>
                </tr>
            </thead>
            <tbody>
                ${subjectsHTML}
            </tbody>
        </table>

        <div class="report-card-comments-grid">
            <div>
                <h4>Class Teacher's General Comment</h4>
                <p>${data.teacherComment}</p>
            </div>
            <div>
                <h4>Principal's Comment</h4>
                <p>${data.principalComment}</p>
            </div>
        </div>

        <div class="report-card-footer">
            <div>
                <h4>Attendance</h4>
                <p>Days Present: ${data.attendance.daysPresent}</p>
                <p>Days Absent: ${data.attendance.daysAbsent}</p>
            </div>
            <div class="signature-area">
                <div class="signature-line"><p>Principal's Signature:</p><span>_________________________</span></div>
                <div class="signature-line"><p>Date:</p><span>_________________________</span></div>
            </div>
        </div>
        <div class="report-card-actions no-print">
            <button onclick="window.print()" class="cta-button"><i class="fas fa-print"></i> Print Report Card</button>
        </div>
    `;

    container.innerHTML = reportHTML;
}

/**
 * Calculates the achievement level based on a percentage score.
 * @param {number} percentage - The percentage score.
 * @returns {{level: number, description: string}}
 */
function getAchievementLevel(percentage) {
    if (percentage >= 80) return { level: 7, description: "Outstanding" };
    if (percentage >= 70) return { level: 6, description: "Meritorious" };
    if (percentage >= 60) return { level: 5, description: "Substantial" };
    if (percentage >= 50) return { level: 4, description: "Adequate" };
    if (percentage >= 40) return { level: 3, description: "Moderate" };
    if (percentage >= 30) return { level: 2, description: "Elementary" };
    return { level: 1, description: "Not Achieved" };
}