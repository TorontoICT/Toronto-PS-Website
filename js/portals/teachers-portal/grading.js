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
    const termFilter = document.getElementById('grading-term-filter');

    if (!classSubjectSelect) return;

    // Set default term based on current date
    if (termFilter) {
        const currentMonth = new Date().getMonth(); // 0 = January
        let defaultTerm = '1';
        if (currentMonth >= 3 && currentMonth <= 5) {
            defaultTerm = '2'; // Apr - Jun
        } else if (currentMonth >= 6 && currentMonth <= 8) {
            defaultTerm = '3'; // Jul - Sep
        } else if (currentMonth >= 9) {
            defaultTerm = '4'; // Oct - Dec
        }
        termFilter.value = defaultTerm;
    }

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

    const loadFilteredGradebook = () => {
        const selectedValue = classSubjectSelect.value;
        const selectedTerm = termFilter.value;

        if (selectedValue && selectedTerm) {
            const [fullClass, subject] = selectedValue.split('|');
            gradebookContainer.style.display = 'block';
            createAssignmentBtn.disabled = false;
            loadGradebook(db, fullClass, subject, selectedTerm);
        } else {
            gradebookContainer.style.display = 'none';
            createAssignmentBtn.disabled = true;
        }
    };

    classSubjectSelect.addEventListener('change', loadFilteredGradebook);
    termFilter.addEventListener('change', loadFilteredGradebook);

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
        const term = document.getElementById('assignment-term').value;

        if (!fullClass || !subject || !assignmentName || !totalMarks || !term) {
            alert('Please ensure a class is selected and all fields are filled.');
            return;
        }

        try {
            await db.collection('assignments').add({
                fullClass,
                subject,
                name: assignmentName,
                totalMarks: parseInt(totalMarks, 10),
                term: parseInt(term, 10),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Assignment created successfully!');
            modal.style.display = 'none';
            form.reset();
            loadGradebook(db, fullClass, subject, document.getElementById('grading-term-filter').value);
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
async function loadGradebook(db, fullClass, subject, term) {
    const generateBtn = document.getElementById('generate-marksheet-btn');
    generateBtn.style.display = 'none';
    const container = document.getElementById('gradebook-table-container');
    const status = document.getElementById('gradebook-status');
    document.getElementById('gradebook-header').textContent = `Gradebook for ${subject} - Class ${fullClass}`;
    status.textContent = 'Loading gradebook...';
    container.innerHTML = '';

    // **NEW**: Setup Search Engine Logic
    const searchInput = document.getElementById('gradebook-search-input');
    if (searchInput) {
        searchInput.value = ''; // Reset search
        searchInput.oninput = function() {
            const filter = this.value.toLowerCase();
            const rows = container.querySelectorAll('table tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(filter) ? '' : 'none';
            });
        };
    }

    try {
        const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', fullClass).get();
        const learners = learnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        sortLearnersByName(learners);

        let assignmentsQuery = db.collection('assignments')
            .where('fullClass', '==', fullClass)
            .where('subject', '==', subject);

        if (term !== 'all') {
            assignmentsQuery = assignmentsQuery.where('term', '==', parseInt(term, 10));
        }

        const assignmentsSnapshot = await assignmentsQuery.orderBy('createdAt').get();
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

    // **NEW**: Helper function to render the mark sheet content based on selected term
    const renderMarkSheet = (selectedTerm) => {
        // Filter assignments based on selection
        const filteredAssignments = (selectedTerm === 'all') 
            ? assignments 
            : assignments.filter(a => a.term == selectedTerm);
        
        // Sort assignments by date
        filteredAssignments.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

        // Prepare Header Data
        const gradeMatch = fullClass.match(/\d+/);
        const grade = gradeMatch ? gradeMatch[0].padStart(2, '0') : '00';
        const teacherSurname = teacherData.surname || '';
        const teacherInitials = teacherData.preferredName ? teacherData.preferredName.charAt(0).toUpperCase() + '.' : '';
        const teacherDisplay = `${teacherSurname} ${teacherInitials}`.trim();
        const currentYear = new Date().getFullYear();

        let totalPossibleMarks = filteredAssignments.reduce((sum, a) => sum + a.totalMarks, 0);

        let tableRows = '';
        learners.forEach((learner, index) => {
            let learnerTotalScore = 0;
            let assignmentCells = '';
            filteredAssignments.forEach(assignment => {
                const score = gradesMap.get(`${learner.id}-${assignment.id}`);
                assignmentCells += `<td>${score !== undefined ? score : 'N/A'}</td>`;
                if (score !== undefined) learnerTotalScore += score;
            });
            const percentage = totalPossibleMarks > 0 ? ((learnerTotalScore / totalPossibleMarks) * 100) : 0;
            const level = getAchievementLevel(percentage);
            
            // Try to determine gender (assuming it might be in the learner object, or default to '-')
            const gender = learner.gender ? learner.gender.charAt(0).toUpperCase() : (learner.sex ? learner.sex.charAt(0).toUpperCase() : '-');

            tableRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${learner.admissionId || 'N/A'}</td>
                    <td style="text-align: left; padding-left: 5px;">${learner.learnerSurname}, ${learner.learnerName}</td>
                    <td>${gender}</td>
                    ${assignmentCells}
                    <td>${learnerTotalScore}</td>
                    <td>${percentage.toFixed(1)}%</td>
                    <td>${level.level} (${level.description})</td>
                </tr>`;
        });

        const marksheetHTML = `
            <span class="modal-close-btn no-print">&times;</span>
            
            <div class="sams-header-container" style="text-align: center; font-family: 'Courier New', Courier, monospace; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                <img src="../../images/Logo.png" alt="School Logo" style="max-width: 100px; display: block; margin: 0 auto 10px;">
                <div style="font-weight: bold; font-size: 1.1em;">${subject} (Gr ${grade})</div>
                <div>Class : ${fullClass}-${teacherDisplay}</div>
                <div>Term ${selectedTerm === 'all' ? '1' : selectedTerm} : ${currentYear}/01/15 - ${currentYear}/03/28</div>
                <div>All Learners</div>
                <div>Patch Version: 25.4.0</div>
            </div>
            
            <div class="marksheet-controls no-print" style="text-align: center; margin-bottom: 15px; padding: 10px; background: #f3f4f6; border-radius: 4px;">
                <label for="ms-term-select" style="font-weight: bold; margin-right: 10px;">Select Mark Sheet Type:</label>
                <select id="ms-term-select" style="padding: 5px; border-radius: 4px; border: 1px solid #ccc;">
                    <option value="all" ${selectedTerm === 'all' ? 'selected' : ''}>Full Year (All Terms)</option>
                    <option value="1" ${selectedTerm == '1' ? 'selected' : ''}>Term 1</option>
                    <option value="2" ${selectedTerm == '2' ? 'selected' : ''}>Term 2</option>
                    <option value="3" ${selectedTerm == '3' ? 'selected' : ''}>Term 3</option>
                    <option value="4" ${selectedTerm == '4' ? 'selected' : ''}>Term 4</option>
                </select>
            </div>

            <div class="data-table-container">
                <table class="data-table marksheet-table" style="font-size: 11px; border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
                    <thead>
                        <!-- Row 1: Tasks -->
                        <tr>
                            <th colspan="4" style="text-align: left; border: 1px solid #000; background: #eee;">TASKS</th>
                            ${filteredAssignments.map(a => `<th style="border: 1px solid #000; background: #eee;">${a.name}</th>`).join('')}
                            <th colspan="3" style="border: 1px solid #000; background: #eee;"></th>
                        </tr>
                        <!-- Row 2: Marks Legend & Totals -->
                        <tr>
                            <th colspan="4" style="text-align: left; border: 1px solid #000; font-weight: normal; font-style: italic;">Marks: -1 = Absent, -2 = Not Captured</th>
                            ${filteredAssignments.map(a => `<th style="border: 1px solid #000;">${a.totalMarks}</th>`).join('')}
                            <th style="border: 1px solid #000;">Total Mark</th>
                            <th style="border: 1px solid #000;">Term %</th>
                            <th style="border: 1px solid #000;">Level</th>
                        </tr>
                        <!-- Row 3: Dates -->
                        <tr>
                            <th colspan="4" style="text-align: left; border: 1px solid #000;">Date</th>
                            ${filteredAssignments.map(a => `<th style="border: 1px solid #000; font-weight: normal;">${a.createdAt ? new Date(a.createdAt.seconds * 1000).toLocaleDateString() : '-'}</th>`).join('')}
                            <th colspan="3" style="border: 1px solid #000;"></th>
                        </tr>
                        <!-- Row 4: Column Headers -->
                        <tr style="background-color: #ddd;">
                            <th style="border: 1px solid #000; width: 30px;">No</th>
                            <th style="border: 1px solid #000;">Acc No</th>
                            <th style="border: 1px solid #000;">Learner</th>
                            <th style="border: 1px solid #000; width: 30px;">Gender</th>
                            ${filteredAssignments.map((a, i) => `<th style="border: 1px solid #000;">T${i+1}</th>`).join('')}
                            <th style="border: 1px solid #000;">Tot</th>
                            <th style="border: 1px solid #000;">%</th>
                            <th style="border: 1px solid #000;">Lvl</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            <div class="marksheet-footer" style="margin-top: 40px; font-family: Arial, sans-serif; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                    <div style="text-align: center; width: 20%;">
                        <div style="border-bottom: 1px solid #000; height: 30px;"></div>
                        <p>Educator</p>
                    </div>
                    <div style="text-align: center; width: 20%;">
                        <div style="border-bottom: 1px solid #000; height: 30px;"></div>
                        <p>Subject HOD</p>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <div style="text-align: center; width: 20%;">
                        <div style="border-bottom: 1px solid #000; height: 30px;"></div>
                        <p>Circuit/District Manager</p>
                    </div>
                    <div style="text-align: center; width: 20%;">
                        <div style="border-bottom: 1px solid #000; height: 30px;"></div>
                        <p>Subject Specialist</p>
                    </div>
                </div>
            </div>
            <div class="marksheet-actions no-print">
                <button id="print-marksheet-btn" class="cta-button"><i class="fas fa-print"></i> Print Mark Sheet</button>
                <button id="export-pdf-btn" class="cta-button primary-red"><i class="fas fa-file-pdf"></i> Export to PDF</button>
                <button id="export-excel-btn" class="cta-button primary-green"><i class="fas fa-file-excel"></i> Export to Excel</button>
            </div>`;

        content.innerHTML = marksheetHTML;

        // Re-attach listeners
        content.querySelector('.modal-close-btn').onclick = () => { modal.style.display = 'none'; };
        
        // Change listener for the dropdown
        document.getElementById('ms-term-select').addEventListener('change', (e) => {
            renderMarkSheet(e.target.value);
        });

        const printMarksheet = () => {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
    
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <html>
                <head>
                    <title>Mark Sheet - ${subject} - ${fullClass}</title>
                    <style>
                        @page { size: auto; margin: 0mm; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; background: #fff; }
                        .sams-header-container { text-align: center; font-family: 'Courier New', Courier, monospace; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .sams-header-container div { margin-bottom: 2px; }
                        .data-table-container { margin-bottom: 30px; }
                        .data-table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        .data-table th, .data-table td { border: 1px solid #000; padding: 4px 6px; text-align: center; }
                        .data-table th { background-color: #eee; font-weight: bold; color: #000; }
                        .marksheet-footer { margin-top: 40px; font-family: Arial, sans-serif; font-size: 12px; page-break-inside: avoid; }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    ${marksheetHTML}
                </body>
                </html>
            `);
            doc.close();
    
            iframe.contentWindow.focus();
            setTimeout(() => {
                iframe.contentWindow.print();
                document.body.removeChild(iframe);
            }, 500);
        };
    
        document.getElementById('print-marksheet-btn').onclick = printMarksheet;
        document.getElementById('export-pdf-btn').onclick = printMarksheet;
        document.getElementById('export-excel-btn').onclick = () => exportMarkSheetToExcel(fullClass, subject, learners, filteredAssignments, gradesMap);
    };

    // Initial Render
    // Check if gradebook was filtered
    const gradebookTermFilter = document.getElementById('grading-term-filter');
    const initialTerm = (gradebookTermFilter && gradebookTermFilter.value !== 'all') ? gradebookTermFilter.value : 'all';
    
    renderMarkSheet(initialTerm);
    modal.style.display = 'block';

    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };
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