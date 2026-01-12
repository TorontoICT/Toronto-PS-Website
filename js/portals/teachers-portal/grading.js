// js/portals/teachers-portal/grading.js

/**
 * Initializes the entire grading system UI and logic.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
function setupGradingSystem(db, teacherAuthData) {
    const classSubjectSelect = document.getElementById('grading-class-subject-select');
    const createAssignmentBtn = document.getElementById('create-new-assignment-btn');
    const gradebookContainer = document.getElementById('gradebook-container');

    if (!classSubjectSelect) return;

    db.collection('users').doc(teacherAuthData.uid).get().then(doc => {
        if (doc.exists) {
            const teacherData = doc.data();
            if (teacherData.teachingAssignments) {
                teacherData.teachingAssignments.forEach(assignment => {
                    const optionValue = `${assignment.fullClass}|${assignment.subject}`;
                    classSubjectSelect.add(new Option(`${assignment.subject} - Class ${assignment.fullClass}`, optionValue));
                });
            }
        }
    });

    classSubjectSelect.addEventListener('change', () => {
        const selectedValue = classSubjectSelect.value;
        if (selectedValue) {
            const [fullClass, subject] = selectedValue.split('|');
            gradebookContainer.style.display = 'block';
            createAssignmentBtn.disabled = false;
            loadGradebook(db, fullClass, subject);
        } else {
            gradebookContainer.style.display = 'none';
            createAssignmentBtn.disabled = true;
        }
    });

    setupAssignmentModal(db, classSubjectSelect);
}

/**
 * Sets up the modal for creating a new assignment.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {HTMLSelectElement} classSubjectSelect - The dropdown for class/subject selection.
 */
function setupAssignmentModal(db, classSubjectSelect) {
    const modal = document.getElementById('create-assignment-modal');
    const btn = document.getElementById('create-new-assignment-btn');
    const closeBtn = modal.querySelector('.modal-close-btn');
    const form = document.getElementById('create-assignment-form');

    btn.onclick = () => modal.style.display = 'block';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = 'none';
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const [fullClass, subject] = classSubjectSelect.value.split('|');
        const assignmentName = document.getElementById('assignment-name').value;
        const totalMarks = document.getElementById('assignment-total-marks').value;

        if (!fullClass || !subject || !assignmentName || !totalMarks) {
            alert('Please ensure a class is selected and all fields are filled.');
            return;
        }

        try {
            await db.collection('assignments').add({
                fullClass, subject, name: assignmentName,
                totalMarks: parseInt(totalMarks, 10),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Assignment created successfully!');
            modal.style.display = 'none';
            form.reset();
            loadGradebook(db, fullClass, subject);
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert('Failed to create assignment. Please try again.');
        }
    });
}

/**
 * Loads learners and assignments to build the gradebook table.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} fullClass - The full class name (e.g., "7A").
 * @param {string} subject - The subject name.
 */
async function loadGradebook(db, fullClass, subject) {
    const generateBtn = document.getElementById('generate-marksheet-btn');
    generateBtn.style.display = 'none';
    const container = document.getElementById('gradebook-table-container');
    const status = document.getElementById('gradebook-status');
    document.getElementById('gradebook-header').textContent = `Gradebook for ${subject} - Class ${fullClass}`;
    status.textContent = 'Loading gradebook...';
    container.innerHTML = '';

    try {
        const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', fullClass).get();
        const learners = learnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        sortLearnersByName(learners);

        const assignmentsSnapshot = await db.collection('assignments').where('fullClass', '==', fullClass).where('subject', '==', subject).orderBy('createdAt').get();
        const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const learnerIds = learners.map(l => l.id);
        const gradesMap = new Map();
        if (learnerIds.length > 0) {
            const promises = [];
            for (let i = 0; i < learnerIds.length; i += 10) {
                const chunk = learnerIds.slice(i, i + 10);
                promises.push(db.collection('grades').where('learnerId', 'in', chunk).get());
            }
            const snapshots = await Promise.all(promises);
            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    const gradeData = doc.data();
                    gradesMap.set(`${gradeData.learnerId}-${gradeData.assignmentId}`, parseInt(gradeData.score, 10));
                });
            });
        }

        if (learners.length === 0) {
            status.textContent = 'No learners found in this class to build a gradebook.';
            return;
        }

        let tableHTML = '<table class="data-table"><thead><tr><th>Learner Name</th>';
        assignments.forEach(a => {
            tableHTML += `<th class="assignment-header"><span>${a.name} (${a.totalMarks})</span><button class="delete-assignment-btn" onclick="confirmDeleteAssignment('${a.id}', '${a.name.replace(/'/g, "\\'")}')" title="Delete this assignment"><i class="fas fa-trash-alt"></i></button></th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        learners.forEach(learner => {
            tableHTML += `<tr><td>${formatLearnerName(learner)}</td>`;
            assignments.forEach(assignment => {
                const grade = gradesMap.get(`${learner.id}-${assignment.id}`) || '';
                const inputId = `grade-input-${learner.id}-${assignment.id}`;
                tableHTML += `<td><input type="number" class="grade-input" id="${inputId}" name="${inputId}" value="${grade}" data-learner-id="${learner.id}" data-assignment-id="${assignment.id}" max="${assignment.totalMarks}" placeholder="--"></td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
        status.textContent = `Displaying gradebook for ${learners.length} learners.`;

        if (learners.length > 0 && assignments.length > 0) {
            generateBtn.style.display = 'inline-block';
            generateBtn.onclick = () => generateMarkSheet(fullClass, subject, learners, assignments, gradesMap);
        }

        document.querySelectorAll('.grade-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const { learnerId, assignmentId } = e.target.dataset;
                const score = e.target.value;
                const totalMarks = parseInt(e.target.max, 10);

                if (parseInt(score, 10) > totalMarks) {
                    alert(`Error: The score cannot be greater than the total marks for this assignment (${totalMarks}).`);
                    e.target.value = '';
                    return;
                }

                const gradeDocId = `${learnerId}_${assignmentId}`;
                const gradeRef = db.collection('grades').doc(gradeDocId);

                try {
                    await gradeRef.set({ learnerId, assignmentId, score: score ? parseInt(score, 10) : firebase.firestore.FieldValue.delete(), fullClass, subject, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
                    gradesMap.set(`${learnerId}-${assignmentId}`, score ? parseInt(score, 10) : undefined);
                    e.target.style.backgroundColor = '#d1fae5';
                    setTimeout(() => e.target.style.backgroundColor = '', 1000);
                } catch (error) {
                    console.error('Error saving grade:', error);
                    e.target.style.backgroundColor = '#fecaca';
                }
            });
        });
    } catch (error) {
        console.error('Error loading gradebook:', error);
        status.textContent = 'An error occurred while loading the gradebook.';
    }
}

/**
 * Confirms and then initiates the deletion of an assignment and all its associated grades.
 * @param {string} assignmentId - The ID of the assignment to delete.
 * @param {string} assignmentName - The name of the assignment for the confirmation dialog.
 */
async function confirmDeleteAssignment(assignmentId, assignmentName) {
    if (!confirm(`Are you sure you want to permanently delete the assignment "${assignmentName}"?\n\nThis will also delete ALL scores entered for this assignment. This action cannot be undone.`)) {
        return;
    }

    const db = firebase.firestore();
    const status = document.getElementById('gradebook-status');
    status.textContent = `Deleting assignment "${assignmentName}"...`;

    try {
        await db.collection('assignments').doc(assignmentId).delete();
        const gradesSnapshot = await db.collection('grades').where('assignmentId', '==', assignmentId).get();
        if (!gradesSnapshot.empty) {
            const batch = db.batch();
            gradesSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        alert(`Assignment "${assignmentName}" and all its scores have been deleted successfully.`);
        const [fullClass, subject] = document.getElementById('grading-class-subject-select').value.split('|');
        if (fullClass && subject) {
            loadGradebook(db, fullClass, subject);
        }
    } catch (error) {
        console.error("Error deleting assignment:", error);
        alert(`Failed to delete assignment: ${error.message}`);
        status.textContent = 'An error occurred while deleting the assignment.';
    }
}

/**
 * Generates a printable mark sheet and displays it in a modal.
 * @param {string} fullClass - The full class name.
 * @param {string} subject - The subject name.
 * @param {Array} learners - Array of learner objects.
 * @param {Array} assignments - Array of assignment objects.
 * @param {Map} gradesMap - Map of grades.
 */
function generateMarkSheet(fullClass, subject, learners, assignments, gradesMap) {
    const modal = document.getElementById('marksheet-modal');
    const content = document.getElementById('marksheet-modal-content');
    const teacherData = JSON.parse(sessionStorage.getItem('currentUser'));

    let totalPossibleMarks = assignments.reduce((sum, a) => sum + a.totalMarks, 0);

    let tableRows = '';
    learners.forEach(learner => {
        let learnerTotalScore = 0;
        let assignmentCells = '';
        assignments.forEach(assignment => {
            const score = gradesMap.get(`${learner.id}-${assignment.id}`);
            assignmentCells += `<td>${score !== undefined ? score : 'N/A'}</td>`;
            if (score !== undefined) learnerTotalScore += score;
        });
        const percentage = totalPossibleMarks > 0 ? ((learnerTotalScore / totalPossibleMarks) * 100) : 0;
        const level = getAchievementLevel(percentage);
        tableRows += `
            <tr>
                <td>${learner.admissionId || 'N/A'}</td>
                <td>${formatLearnerName(learner)}</td>
                ${assignmentCells}
                <td>${learnerTotalScore}</td>
                <td>${percentage.toFixed(1)}%</td>
                <td>${level.level} (${level.description})</td>
            </tr>`;
    });

    const marksheetHTML = `
        <div class="marksheet-header">
            <span class="modal-close-btn no-print">&times;</span>
            <img src="../../images/Logo.png" alt="School Logo" class="school-logo">
            <h1>TORONTO PRIMARY SCHOOL</h1>
            <h2>Mark Sheet: ${subject} - Class ${fullClass}</h2>
            <p><strong>Educator:</strong> ${teacherData.preferredName || ''}</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="data-table-container">
            <table class="data-table marksheet-table">
                <thead>
                    <tr>
                        <th>Adm No.</th><th>Learner Name</th>
                        ${assignments.map(a => `<th>${a.name}<br>(${a.totalMarks})</th>`).join('')}
                        <th>Total<br>(${totalPossibleMarks})</th><th>%</th><th>Level</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
        <div class="marksheet-footer">
            <div class="signature-line"><p>Educator's Signature:</p><span>_________________________</span></div>
            <div class="signature-line"><p>Date:</p><span>_________________________</span></div>
        </div>
        <div class="marksheet-actions no-print">
            <button onclick="window.print()" class="cta-button"><i class="fas fa-print"></i> Print Mark Sheet</button>
            <button id="export-excel-btn" class="cta-button primary-green"><i class="fas fa-file-excel"></i> Export to Excel</button>
        </div>`;

    content.innerHTML = marksheetHTML;
    modal.style.display = 'block';

    modal.querySelector('.modal-close-btn').onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };
    document.getElementById('export-excel-btn').onclick = () => exportMarkSheetToExcel(fullClass, subject, learners, assignments, gradesMap);
}

/**
 * Exports the mark sheet data to an Excel file.
 * @param {string} fullClass - The full class name.
 * @param {string} subject - The subject name.
 * @param {Array} learners - Array of learner objects.
 * @param {Array} assignments - Array of assignment objects.
 * @param {Map} gradesMap - Map of grades.
 */
function exportMarkSheetToExcel(fullClass, subject, learners, assignments, gradesMap) {
    const dataForExport = [];
    const headers = ['Admission No.', 'Learner Name'];
    let totalPossibleMarks = 0;

    assignments.forEach(a => {
        headers.push(`${a.name} (${a.totalMarks})`);
        totalPossibleMarks += a.totalMarks;
    });
    headers.push(`Total (${totalPossibleMarks})`, '%', 'Level');
    dataForExport.push(headers);

    learners.forEach(learner => {
        const row = [learner.admissionId || 'N/A', formatLearnerName(learner)];
        let learnerTotalScore = 0;
        assignments.forEach(assignment => {
            const score = gradesMap.get(`${learner.id}-${assignment.id}`);
            row.push(score !== undefined ? score : '');
            if (score !== undefined) learnerTotalScore += score;
        });
        const percentage = totalPossibleMarks > 0 ? ((learnerTotalScore / totalPossibleMarks) * 100) : 0;
        row.push(learnerTotalScore, percentage.toFixed(1) + '%', getAchievementLevel(percentage).level);
        dataForExport.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mark Sheet');
    XLSX.writeFile(workbook, `MarkSheet_${subject}_${fullClass}_${new Date().toISOString().split('T')[0]}.xlsx`);
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