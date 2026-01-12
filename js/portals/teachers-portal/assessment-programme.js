// js/portals/teachers-portal/assessment-programme.js

export function setupAssessmentProgramme(db, userData) {
    // --- STATE MANAGEMENT ---
    let state = {
        terms: [],
        assessments: [],
        activeTerm: 1,
        showAssessmentForm: false,
        editingAssessmentId: null // NEW: To track which assessment is being edited
    };

    const teacherUid = userData.uid;

    // --- DOM ELEMENTS ---
    const assessmentTableBody = document.getElementById('ap-assessment-table-body');
    const assessmentTitle = document.getElementById('ap-assessment-title');
    const showFormBtn = document.getElementById('ap-show-assessment-form-btn');
    const formContainer = document.getElementById('ap-add-assessment-form-container');
    const form = document.getElementById('ap-add-assessment-form');
    const cancelFormBtn = document.getElementById('ap-cancel-assessment-btn');
    const noAssessmentsMsg = document.getElementById('ap-no-assessments-message');
    const summaryStatsContainer = document.getElementById('ap-summary-stats');
    const exportExcelBtn = document.getElementById('ap-export-excel-btn');
    const exportPdfBtn = document.getElementById('ap-export-pdf-btn'); // NEW
    const exportWordBtn = document.getElementById('ap-export-word-btn'); // NEW
    // New element for Term Filter
    const termFilterSelect = document.getElementById('ap-term-filter');
    // New elements for Auto-Planner
    const autoPlanBtn = document.getElementById('ap-auto-plan-btn');
    const autoPlanModal = document.getElementById('auto-plan-modal');
    const autoPlanModalClose = document.getElementById('auto-plan-modal-close');
    const autoPlanForm = document.getElementById('auto-plan-form');
    // NEW: PDF Export Modal elements
    const pdfExportModal = document.getElementById('ap-pdf-export-modal');
    const pdfExportModalClose = document.getElementById('ap-pdf-export-modal-close');
    const pdfExportSelect = document.getElementById('ap-pdf-export-select');
    const generateSelectedPdfBtn = document.getElementById('ap-generate-selected-pdf-btn');
    // NEW: Word Export Modal elements
    const wordExportModal = document.getElementById('ap-word-export-modal');
    const wordExportModalClose = document.getElementById('ap-word-export-modal-close');
    const wordExportSelect = document.getElementById('ap-word-export-select');
    const generateSelectedWordBtn = document.getElementById('ap-generate-selected-word-btn');
    // NEW: Excel Export Modal elements
    const excelExportModal = document.getElementById('ap-excel-export-modal');
    const excelExportModalClose = document.getElementById('ap-excel-export-modal-close');
    const excelExportSelect = document.getElementById('ap-excel-export-select');
    const generateSelectedExcelBtn = document.getElementById('ap-generate-selected-excel-btn');



    // --- RENDER FUNCTIONS ---

    function render() {
        renderAssessments();
        renderSummaryStats();
        updateFormState();
    }

    function renderAssessments() {
        const termAssessments = state.assessments
            .filter(a => a.term === state.activeTerm)
            .sort((a, b) => new Date(a.assessmentDate) - new Date(b.assessmentDate));

        const currentTerm = state.terms.find(t => t.id === state.activeTerm);
        if (currentTerm) {
            assessmentTitle.textContent = `${currentTerm.name} Assessments`;
        } else {
            assessmentTitle.textContent = 'Assessments'; // Fallback title
        }

        if (termAssessments.length === 0 && state.assessments.length === 0) { // Only show message if no assessments at all
            assessmentTableBody.innerHTML = '';
            noAssessmentsMsg.style.display = 'block';
        } else {
            noAssessmentsMsg.style.display = 'none';
            assessmentTableBody.innerHTML = termAssessments.map(a => {
                const conflict = checkDateConflict(a.assessmentDate, a.term);
                const target = a.targetPercentage ? `${a.targetPercentage}%` : 'N/A';
                const duration = a.duration ? `${a.duration} min` : 'N/A';
                const topics = a.topics || 'N/A';
                const moderationDate = a.moderationDate ? new Date(a.moderationDate + 'T00:00:00').toLocaleDateString() : 'N/A';
                const assessmentDate = a.assessmentDate || 'N/A';
                const status = a.status || 'Pending'; // Default status

                return `
                    <tr data-assessment-id="${a.id}" class="${conflict ? 'conflict-row' : ''}">
                        <td>${a.term}</td>
                        <td>${a.type}</td>
                        <td>${a.subject}</td>
                        <td>${a.grade}</td>
                        <td>${moderationDate}</td>
                        <td>${assessmentDate} ${conflict ? `<div class="ap-conflict-warning" style="font-size: 0.75rem;"><i class="fas fa-exclamation-triangle"></i> ${conflict}</div>` : ''}</td>
                        <td>${a.totalMarks || 'N/A'}</td>
                        <td>${target}</td>
                        <td>${duration}</td>
                        <td><div class="topics-cell">${topics}</div></td>
                        <td>
                            <button class="cta-button-small ap-edit-assessment-btn" title="Edit Assessment"><i class="fas fa-edit"></i></button>
                            <button class="cta-button-small danger ap-delete-assessment-btn" title="Delete Assessment"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    function renderSummaryStats() {
        summaryStatsContainer.innerHTML = state.terms.map(term => `
            <div class="ap-summary-card">
                <h3>${term.name}</h3>
                <p style="font-size: 1.5rem; font-weight: 700; color: var(--primary-indigo);">
                    ${state.assessments.filter(a => a.term === term.id).length}
                </p>
                <p style="font-size: 0.875rem; color: var(--text-muted);">Assessments</p>
            </div>
        `).join('');
    }

    function updateFormState() {
        formContainer.style.display = state.showAssessmentForm ? 'block' : 'none';
        const submitBtn = form.querySelector('button[type="submit"]');

        if (state.showAssessmentForm) {
            const termSelect = document.getElementById('ap-assessment-term');
            termSelect.innerHTML = state.terms.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

            if (state.editingAssessmentId !== null) {
                // --- EDIT MODE ---
                const assessment = state.assessments.find(a => a.id === state.editingAssessmentId);
                if (assessment) {
                    document.getElementById('ap-form-title').textContent = `Edit Assessment`;
                    submitBtn.innerHTML = `<i class="fas fa-save"></i> Save Changes`;

                    termSelect.value = assessment.term;
                    document.getElementById('ap-assessment-type').value = assessment.type || '';
                    document.getElementById('ap-assessment-subject').value = assessment.subject || '';
                    document.getElementById('ap-assessment-grade').value = assessment.grade || '';
                    document.getElementById('ap-assessment-date').value = assessment.assessmentDate || '';
                    document.getElementById('ap-assessment-moderation-date').value = assessment.moderationDate || '';
                    document.getElementById('ap-assessment-total-marks').value = assessment.totalMarks || '';
                    document.getElementById('ap-assessment-target-percentage').value = assessment.targetPercentage || '';
                    document.getElementById('ap-assessment-duration').value = assessment.duration || '';
                    document.getElementById('ap-assessment-topics').value = assessment.topics || '';
                }
            } else {
                // --- ADD NEW MODE ---
                const currentTerm = state.terms.find(t => t.id === state.activeTerm);
                const termName = currentTerm ? currentTerm.name : `Term ${state.activeTerm}`;
                document.getElementById('ap-form-title').textContent = `New Assessment for ${termName}`;
                submitBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Add Assessment`;

                termSelect.value = state.activeTerm;
                findNextAvailableDate(state.activeTerm);

                document.getElementById('ap-assessment-type').value = '';
                document.getElementById('ap-assessment-subject').value = '';
                document.getElementById('ap-assessment-grade').value = '';
                document.getElementById('ap-assessment-date').value = '';
                document.getElementById('ap-assessment-moderation-date').value = '';
                document.getElementById('ap-assessment-total-marks').value = '';
                document.getElementById('ap-assessment-target-percentage').value = '';
                document.getElementById('ap-assessment-duration').value = '';
                document.getElementById('ap-assessment-topics').value = '';
                document.getElementById('ap-date-conflict-warning').style.display = 'none';
            }
        }
    }

    // --- EVENT HANDLERS ---

    termFilterSelect.addEventListener('change', (e) => {
        state.activeTerm = parseInt(e.target.value);
        state.showAssessmentForm = false;
        state.editingAssessmentId = null; // Exit edit mode when switching terms
        render();
    });

    showFormBtn.addEventListener('click', () => {
        state.showAssessmentForm = !state.showAssessmentForm;
        updateFormState();
    });

    cancelFormBtn.addEventListener('click', () => {
        state.showAssessmentForm = false;
        state.editingAssessmentId = null; // Exit edit mode on cancel
        updateFormState();
    });

    form.addEventListener('submit', e => {
        e.preventDefault();
        const assessmentData = {
            term: parseInt(document.getElementById('ap-assessment-term').value),
            type: document.getElementById('ap-assessment-type').value,
            subject: document.getElementById('ap-assessment-subject').value,
            grade: document.getElementById('ap-assessment-grade').value,
            moderationDate: document.getElementById('ap-assessment-moderation-date').value || null,
            assessmentDate: document.getElementById('ap-assessment-date').value,
            totalMarks: document.getElementById('ap-assessment-total-marks').value ? parseInt(document.getElementById('ap-assessment-total-marks').value) : null,
            targetPercentage: document.getElementById('ap-assessment-target-percentage').value ? parseInt(document.getElementById('ap-assessment-target-percentage').value) : null,
            duration: document.getElementById('ap-assessment-duration').value ? parseInt(document.getElementById('ap-assessment-duration').value) : null,
            topics: document.getElementById('ap-assessment-topics').value,
        };

        if (state.editingAssessmentId !== null) {
            // --- UPDATE EXISTING ASSESSMENT ---
            const index = state.assessments.findIndex(a => a.id === state.editingAssessmentId);
            if (index !== -1) {
                state.assessments[index] = {
                    ...state.assessments[index], // Keep original id and status
                    ...assessmentData
                };
            }
        } else {
            // --- ADD NEW ASSESSMENT ---
            const newAssessment = {
                ...assessmentData,
                id: Date.now(),
                status: 'Pending'
            };
            state.assessments.push(newAssessment);
        }

        state.editingAssessmentId = null; // Exit edit mode
        state.showAssessmentForm = false;
        render();
        saveAssessmentProgramme(db);
    });

    assessmentTableBody.addEventListener('click', e => {
        if (e.target.matches('.ap-edit-assessment-btn, .ap-edit-assessment-btn *')) {
            const assessmentId = parseInt(e.target.closest('tr').dataset.assessmentId);
            handleEditAssessment(assessmentId);
        }
        if (e.target.matches('.ap-delete-assessment-btn, .ap-delete-assessment-btn *')) {
            const assessmentId = parseInt(e.target.closest('tr').dataset.assessmentId);
            state.assessments = state.assessments.filter(a => a.id !== assessmentId);
            renderAssessments();
            renderSummaryStats();
            saveAssessmentProgramme(db); // Auto-save on delete
        }
    });

    // **NEW**: Add listener to the new term dropdown in the form
    document.getElementById('ap-assessment-term').addEventListener('change', e => {
        const selectedTermId = parseInt(e.target.value);
        // Find the next available assessment date for the newly selected term and update the date input
        findNextAvailableDate(selectedTermId);
    });

    // --- AUTO-PLANNER EVENT HANDLERS ---
    autoPlanBtn.addEventListener('click', async () => {
        // Populate the subject/class dropdown from the teacher's data
        const classSubjectSelect = document.getElementById('auto-plan-class-subject');
        classSubjectSelect.innerHTML = '<option value="">-- Loading your classes... --</option>';

        try {
            // **FIX**: Fetch the latest teacher data directly from Firestore to ensure subjects are loaded.
            const teacherDoc = await db.collection('users').doc(teacherUid).get();
            if (teacherDoc.exists) {
                const teacherData = teacherDoc.data();
                if (teacherData.subjects && teacherData.subjects.length > 0) {
                    classSubjectSelect.innerHTML = '<option value="">-- Select a Subject/Class --</option>';
                    teacherData.subjects.forEach(sub => {
                        const value = `${sub.grade}-${sub.subject}`;
                        const text = `${sub.grade} - ${sub.subject}`;
                        classSubjectSelect.innerHTML += `<option value="${value}">${text}</option>`;
                    });
                } else {
                    classSubjectSelect.innerHTML = '<option value="">-- No classes assigned --</option>';
                }
            }
        } catch (error) {
            console.error("Error fetching teacher subjects for auto-planner:", error);
            classSubjectSelect.innerHTML = '<option value="">-- Error loading classes --</option>';
        }

        // form.reset() clears the select options, so we reset the number inputs manually.
        document.getElementById('auto-plan-term-1').value = 4;
        document.getElementById('auto-plan-term-2').value = 4;
        document.getElementById('auto-plan-term-3').value = 4;
        document.getElementById('auto-plan-term-4').value = 4;
        document.getElementById('auto-plan-status').style.display = 'none';
        autoPlanModal.style.display = 'flex';
    });

    autoPlanModalClose.addEventListener('click', () => {
        autoPlanModal.style.display = 'none';
    });

    autoPlanForm.addEventListener('submit', (e) => {
        e.preventDefault();
        runAutoPlanner();
    });


    // --- HELPER & LOGIC FUNCTIONS ---

    function handleEditAssessment(assessmentId) {
        const assessment = state.assessments.find(a => a.id === assessmentId);
        if (!assessment) return;
        state.editingAssessmentId = assessmentId;
        state.showAssessmentForm = true;
        updateFormState();
    }
    function checkDateConflict(dateStr, termId) { // Use assessmentDate here
        const term = state.terms.find(t => t.id === termId);
        if (!term || !dateStr) return null;

        const d = new Date(dateStr + 'T00:00:00');

        if (term.startDate && term.endDate) {
            if (d < new Date(term.startDate + 'T00:00:00') || d > new Date(term.endDate + 'T00:00:00')) {
                return 'Outside term dates';
            }
        }
        for (let holiday of term.holidays) {
            if (holiday.start && holiday.end) {
                if (d >= new Date(holiday.start + 'T00:00:00') && d <= new Date(holiday.end + 'T00:00:00')) {
                    return `Holiday: ${holiday.name}`;
                }
            }
        }
        return null;
    }

    function formatDate(dateValue) {
        if (!dateValue) return '';
        if (typeof dateValue === 'number') { // Excel serial date
            const date = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
        }
        const date = new Date(dateValue);
        return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : '';
    }

    // --- PDF EXPORT LOGIC (REVISED) ---
    exportPdfBtn.addEventListener('click', () => {
        // 1. Populate the dropdown with unique subject-grade combinations
        const programmes = [...new Set(state.assessments.map(a => `${a.subject}|${a.grade}`))];
        
        pdfExportSelect.innerHTML = '<option value="">-- Select a Programme --</option>'; // Reset
        if (programmes.length > 0) {
            programmes.sort().forEach(p => {
                const [subject, grade] = p.split('|');
                pdfExportSelect.innerHTML += `<option value="${p}">${grade} - ${subject}</option>`;
            });
        } else {
            pdfExportSelect.innerHTML = '<option value="">No programmes to export</option>';
        }

        // 2. Show the modal
        pdfExportModal.style.display = 'flex';
    });

    pdfExportModalClose.addEventListener('click', () => {
        pdfExportModal.style.display = 'none';
    });

    generateSelectedPdfBtn.addEventListener('click', async () => {
        const selectedProgramme = pdfExportSelect.value;
        if (selectedProgramme) {
            const [subject, grade] = selectedProgramme.split('|');
            await exportToPdf(userData, subject, grade);
            pdfExportModal.style.display = 'none'; // Close modal after generating
        } else {
            const statusEl = document.getElementById('ap-pdf-export-status');
            statusEl.textContent = 'Please select a programme first.';
            statusEl.className = 'status-message-box error';
            statusEl.style.display = 'block';
            setTimeout(() => statusEl.style.display = 'none', 3000);
        }
    });

    // --- WORD EXPORT LOGIC (REVISED) ---
    exportWordBtn.addEventListener('click', () => {
        const programmes = [...new Set(state.assessments.map(a => `${a.subject}|${a.grade}`))];
        
        wordExportSelect.innerHTML = '<option value="">-- Select a Programme --</option>'; // Reset
        if (programmes.length > 0) {
            programmes.sort().forEach(p => {
                const [subject, grade] = p.split('|');
                wordExportSelect.innerHTML += `<option value="${p}">${grade} - ${subject}</option>`;
            });
        } else {
            wordExportSelect.innerHTML = '<option value="">No programmes to export</option>';
        }
        wordExportModal.style.display = 'flex';
    });

    wordExportModalClose.addEventListener('click', () => {
        wordExportModal.style.display = 'none';
    });

    generateSelectedWordBtn.addEventListener('click', async () => {
        const selectedProgramme = wordExportSelect.value;
        if (selectedProgramme) {
            const [subject, grade] = selectedProgramme.split('|');
            await exportToWord(userData, subject, grade);
            wordExportModal.style.display = 'none';
        } else {
            const statusEl = document.getElementById('ap-word-export-status');
            statusEl.textContent = 'Please select a programme first.';
            statusEl.className = 'status-message-box error';
            statusEl.style.display = 'block';
            setTimeout(() => statusEl.style.display = 'none', 3000);
        }
    });

    // --- EXCEL EXPORT LOGIC (REVISED) ---
    exportExcelBtn.addEventListener('click', () => {
        const programmes = [...new Set(state.assessments.map(a => `${a.subject}|${a.grade}`))];
        
        excelExportSelect.innerHTML = '<option value="">-- Select a Programme --</option>'; // Reset
        if (programmes.length > 0) {
            programmes.sort().forEach(p => {
                const [subject, grade] = p.split('|');
                excelExportSelect.innerHTML += `<option value="${p}">${grade} - ${subject}</option>`;
            });
        } else {
            excelExportSelect.innerHTML = '<option value="">No programmes to export</option>';
        }
        excelExportModal.style.display = 'flex';
    });

    excelExportModalClose.addEventListener('click', () => {
        excelExportModal.style.display = 'none';
    });

    generateSelectedExcelBtn.addEventListener('click', () => {
        const selectedProgramme = excelExportSelect.value;
        if (selectedProgramme) {
            const [subject, grade] = selectedProgramme.split('|');
            exportToExcel(subject, grade);
            excelExportModal.style.display = 'none';
        } else {
            const statusEl = document.getElementById('ap-excel-export-status');
            statusEl.textContent = 'Please select a programme first.';
            statusEl.className = 'status-message-box error';
            statusEl.style.display = 'block';
            setTimeout(() => statusEl.style.display = 'none', 3000);
        }
    });

    /**
     * Exports the selected assessment programme to an Excel file.
     * @param {string} subject The subject to filter by.
     * @param {string} grade The grade to filter by.
     */
    function exportToExcel(subject, grade) {
        const filteredAssessments = state.assessments
            .filter(a => a.subject === subject && a.grade === grade)
            .sort((a, b) => {
                if (a.term !== b.term) return a.term - b.term;
                return new Date(a.assessmentDate) - new Date(b.assessmentDate);
            });

        const assessmentData = [
            [`Assessment Programme for ${grade} - ${subject}`],
            ['Term', 'Type', 'Moderation Date', 'Assessment Date', 'Marks', 'Target (%)', 'Duration (min)', 'Topics'],
            ...filteredAssessments.map(a => [
                a.term,
                a.type || 'N/A',
                a.moderationDate || 'N/A',
                a.assessmentDate || 'N/A',
                a.totalMarks || 'N/A',
                a.targetPercentage || 'N/A',
                a.duration || 'N/A',
                a.topics || 'N/A'
            ])
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(assessmentData);

        // Auto-fit columns for better readability
        const colWidths = assessmentData[1].map((_, i) => ({
            wch: Math.max(...assessmentData.map(row => row[i] ? row[i].toString().length : 0)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Assessments');

        XLSX.writeFile(wb, `Assessment_Programme_${grade}_${subject}.xlsx`);
    }

    // --- INITIALIZATION ---
    function init() {
        loadAssessmentProgramme(db);
    }

    // --- AUTO-PLANNER CORE LOGIC ---
    function runAutoPlanner() {
        const classSubject = document.getElementById('auto-plan-class-subject').value;
        const statusEl = document.getElementById('auto-plan-status');
        
        if (!classSubject) {
            statusEl.className = 'status-message-box error';
            statusEl.textContent = 'Please select a Subject/Class to plan for.';
            statusEl.style.display = 'block';
            return;
        }

        const [grade, subject] = classSubject.split('-');
        const termCounts = [
            { termId: 1, count: parseInt(document.getElementById('auto-plan-term-1').value) || 0 },
            { termId: 2, count: parseInt(document.getElementById('auto-plan-term-2').value) || 0 },
            { termId: 3, count: parseInt(document.getElementById('auto-plan-term-3').value) || 0 },
            { termId: 4, count: parseInt(document.getElementById('auto-plan-term-4').value) || 0 }
        ];

        // Clear existing assessments for this subject/grade combination
        state.assessments = state.assessments.filter(a => a.subject !== subject || a.grade !== grade);
        let totalScheduled = 0;

        for (const { termId, count } of termCounts) {
            if (count === 0) continue;

            const term = state.terms.find(t => t.id === termId);
            if (!term || !term.startDate || !term.endDate) {
                console.warn(`Skipping Term ${termId}: Start and end dates are not set.`);
                continue;
            }

            // 1. Get all available weekdays in the term
            let availableDates = [];
            let currentDate = new Date(term.startDate + 'T00:00:00');
            const endDate = new Date(term.endDate + 'T00:00:00');

            while (currentDate <= endDate) {
                const day = currentDate.getDay();
                if (day > 0 && day < 6) availableDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // 2. Remove holidays and already scheduled dates (from other subjects)
            const holidays = term.holidays.flatMap(h => {
                let dates = [];
                if (!h.start || !h.end) return [];
                let d = new Date(h.start + 'T00:00:00');
                const end = new Date(h.end + 'T00:00:00');
                while (d <= end) {
                    dates.push(d.toISOString().split('T')[0]);
                    d.setDate(d.getDate() + 1);
                }
                return dates;
            });
            const existingAssessmentDates = state.assessments.map(a => a.date);
            const reservedDates = new Set([...holidays, ...existingAssessmentDates]);
            availableDates = availableDates.filter(d => !reservedDates.has(d.toISOString().split('T')[0]));

            if (availableDates.length < count) {
                console.warn(`Not enough available days in Term ${termId} to schedule ${count} assessments.`);
                continue;
            }

            // 3. Distribute the new assessments evenly
            const step = Math.floor(availableDates.length / count);
            for (let i = 0; i < count; i++) {
                const dateIndex = i * step;
                const scheduledDate = availableDates[dateIndex];

                state.assessments.push({
                    id: Date.now() + totalScheduled + i,
                    term: termId,
                    subject: subject,
                    grade: grade,
                    type: null, // Default to null for auto-planned
                    moderationDate: null, // Default to null for auto-planned
                    assessmentDate: scheduledDate.toISOString().split('T')[0], // Use assessmentDate
                    totalMarks: null, // Default to null for auto-planned
                    targetPercentage: null, // Default to null for auto-planned
                    duration: null, // Default to null for auto-planned
                    topics: null // Default to null for auto-planned
                });
            }
            totalScheduled += count;
        }

        // 4. Update UI and save
        statusEl.className = 'status-message-box success';
        statusEl.textContent = `Successfully generated a plan with ${totalScheduled} assessments!`;
        statusEl.style.display = 'block';

        render();
        saveAssessmentProgramme(db);

        setTimeout(() => { autoPlanModal.style.display = 'none'; statusEl.style.display = 'none'; }, 2000);
    }

    init();

    /**
     * Loads the teacher's specific assessment programme from Firestore.
     * @param {firebase.firestore.Firestore} db - The Firestore database instance.
     */
    async function loadAssessmentProgramme(db) {
        const assessmentDocRef = db.collection('assessment_programmes').doc(teacherUid);
        const calendarDocRef = db.collection('school_config').doc('main_calendar');

        try {
            // Fetch both documents concurrently
            const [assessmentDoc, calendarDoc] = await Promise.all([assessmentDocRef.get(), calendarDocRef.get()]);

            // Load official school terms for date validation and form population
            if (calendarDoc.exists && calendarDoc.data().terms) {
                state.terms = calendarDoc.data().terms;
            }

            // Load the teacher's saved assessments
            if (assessmentDoc.exists && assessmentDoc.data().assessments) {
                state.assessments = assessmentDoc.data().assessments;
            }
            // If doc doesn't exist, the default initial state will be used.
        } catch (error) {
            console.error("Error loading assessment programme:", error);
        } finally {
            render(); // Render the UI with either loaded data or default data
        }
    }

    /**
     * Saves the current state of the assessment programme to the teacher's specific document in Firestore.
     * @param {firebase.firestore.Firestore} db - The Firestore database instance.
     * @param {HTMLButtonElement} saveBtn - The button that was clicked.
     */
    async function saveAssessmentProgramme(db) {
        const dataToSave = {
            terms: state.terms, // Also save the term structure
            assessments: state.assessments,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('assessment_programmes').doc(teacherUid).set(dataToSave, { merge: true });
            console.log("Assessments saved successfully.");
        } catch (error) {
            console.error("Error saving assessment programme:", error);
        }
    }

    /**
     * Finds the next available weekday for an assessment in a given term and updates the date input.
     * @param {number} termId The ID of the term to search within.
     */
    function findNextAvailableDate(termId) {
        const dateInput = document.getElementById('ap-assessment-date');
        const warningEl = document.getElementById('ap-date-conflict-warning');
        dateInput.value = ''; // Clear previous date
        warningEl.style.display = 'none';

        const term = state.terms.find(t => t.id === termId);
        if (!term || !term.startDate || !term.endDate) {
            warningEl.textContent = 'Term dates are not set. Please set them in the School Calendar.';
            warningEl.style.display = 'block';
            return;
        }

        // 1. Find the latest date used in this term to start searching from there
        const termAssessments = state.assessments.filter(a => a.term === termId);
        let searchStartDate = new Date(term.startDate + 'T00:00:00');
        if (termAssessments.length > 0) { // Use assessmentDate for sorting
            const latestAssessment = termAssessments.sort((a, b) => new Date(b.assessmentDate) - new Date(a.assessmentDate))[0];
            searchStartDate = new Date(latestAssessment.assessmentDate + 'T00:00:00');
            searchStartDate.setDate(searchStartDate.getDate() + 1); // Start searching from the day after
        }

        // 2. Gather all reserved dates (holidays and existing assessments)
        const allHolidays = state.terms.flatMap(t => t.holidays).flatMap(h => {
            if (!h.start || !h.end) return [];
            let dates = [];
            let d = new Date(h.start + 'T00:00:00');
            const end = new Date(h.end + 'T00:00:00');
            while (d <= end) {
                dates.push(d.toISOString().split('T')[0]);
                d.setDate(d.getDate() + 1);
            }
            return dates;
        });
        const allAssessmentDates = state.assessments.map(a => a.assessmentDate); // Use assessmentDate
        const reservedDates = new Set([...allHolidays, ...allAssessmentDates]);

        // 3. Loop from the search start date to the end of the term
        let currentDate = searchStartDate;
        const termEndDate = new Date(term.endDate + 'T00:00:00');
        while (currentDate <= termEndDate) {
            const day = currentDate.getDay();
            const dateStr = currentDate.toISOString().split('T')[0];
            if (day > 0 && day < 6 && !reservedDates.has(dateStr)) {
                dateInput.value = dateStr; // Found an available date!
                return;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // If loop finishes, no date was found
        warningEl.textContent = 'No available weekdays found in this term.';
        warningEl.style.display = 'block';
    }
        /**
     * Generates the complete HTML content for a specific assessment programme.
     * This is a shared function used by both PDF and Word exports.
     * @param {object} userData - The authenticated teacher's data.
     * @param {string} subject - The subject to filter by.
     * @param {string} grade - The grade to filter by. (Used in header)
     * @returns {string} The full HTML string for the document.
     */
    async function generateProgrammeHtml(userData, subject, grade) {
        const schoolName = "TORONTO PRIMARY SCHOOL";
        const educatorName = `${userData.preferredName || ''}`.trim();
        const currentYear = new Date().getFullYear();
        const schoolLogoPath = '../../images/Logo.png';

        // --- Fetch Signatory Names ---
        let hodName = 'HOD Signature';
        let principalName = 'Principal Signature';

        // Define the mapping from subjects to departments
        // Ensure these subject names match those in teaching assignment dropdowns (e.g., in auth.js)
        const subjectToDepartmentMap = {
            // Science & Maths Department
            'Mathematics': 'Science & Maths',
            'NS-Tech': 'Science & Maths',
            'N.S': 'Science & Maths', // Matches dropdown
            'Technology': 'Science & Maths',
            'Coding and Robotics': 'Science & Maths',
            // Languages Department
            'Sepedi HL': 'Languages',
            'English FAL': 'Languages',
            // Humanities Department
            'EMS': 'Humanities',
            'Social Sciences': 'Humanities',
            'Creative Arts': 'Humanities',
            'Life Skills': 'Humanities',
            'L.O': 'Humanities', // Matches dropdown
            // Foundation Phase (All) Department
            'All Subjects (Foundation)': 'Foundation Phase'
        };

        try {
            // 1. Determine the department for the given subject
            const assessmentDepartment = subjectToDepartmentMap[subject];

            // 2. Find the HOD for that specific department
            if (assessmentDepartment) {
                const hodQuery = await db.collection('users').where('smtRole', '==', 'dh').where('dhDepartments', 'array-contains', assessmentDepartment).limit(1).get();
                if (!hodQuery.empty) {
                    const hodData = hodQuery.docs[0].data();
                    hodName = `${hodData.preferredName || ''} ${hodData.surname || ''}`.trim();
                }
            }

            // 3. Find the Principal
            const principalQuery = await db.collection('users').where('smtRole', '==', 'principal').limit(1).get();
            if (!principalQuery.empty) {
                const principalData = principalQuery.docs[0].data();
                principalName = `${principalData.preferredName || ''} ${principalData.surname || ''}`.trim();
            }
        } catch (error) {
            console.error("Error fetching signatory names:", error);
        }

        const tableHeaders = `
            <thead>
                <tr>
                    <th>Term</th><th>Type</th><th>Moderation Date</th>
                    <th>Assessment Date</th><th>Marks</th><th>Target</th><th>Duration</th><th>Topics</th>
                </tr>
            </thead>
        `;
    
        // REVISED: Filter assessments for the selected subject and grade, then sort.
        const filteredAssessments = state.assessments
            .filter(a => a.subject === subject && a.grade === grade)
            .sort((a, b) => {
                if (a.term !== b.term) {
                    return a.term - b.term; // Sort by term first
                }
                return new Date(a.assessmentDate) - new Date(b.assessmentDate); // Then by date
            });

        // NEW: Logic to group assessments by term to enable rowspan for merged cells.
        const assessmentsByTerm = filteredAssessments.reduce((acc, assessment) => {
            (acc[assessment.term] = acc[assessment.term] || []).push(assessment);
            return acc;
        }, {});

        let allRowsHtml = '';
        Object.keys(assessmentsByTerm).sort((a, b) => a - b).forEach(term => {
            const termAssessments = assessmentsByTerm[term];
            
            // Group by target within the term
            const assessmentsByTarget = termAssessments.reduce((acc, assessment) => {
                const targetKey = assessment.targetPercentage || 'N/A';
                (acc[targetKey] = acc[targetKey] || []).push(assessment);
                return acc;
            }, {});

            let isFirstRowOfTerm = true;
            Object.keys(assessmentsByTarget).forEach(targetKey => {
                const targetAssessments = assessmentsByTarget[targetKey];
                let isFirstRowOfTargetGroup = true;

                targetAssessments.forEach(a => {
                    const duration = a.duration ? `${a.duration} min` : 'N/A';
                    const topics = a.topics || 'N/A';
                    const moderationDate = a.moderationDate ? new Date(a.moderationDate + 'T00:00:00').toLocaleDateString() : 'N/A';
                    const assessmentDate = a.assessmentDate ? new Date(a.assessmentDate + 'T00:00:00').toLocaleDateString() : 'N/A';
                    const targetDisplay = a.targetPercentage ? `${a.targetPercentage}%` : 'N/A';

                    allRowsHtml += '<tr>';
                    if (isFirstRowOfTerm) {
                        allRowsHtml += `<td rowspan="${termAssessments.length}" style="vertical-align: middle; text-align: center;">${a.term}</td>`;
                    }
                    allRowsHtml += `<td>${a.type || 'N/A'}</td><td>${moderationDate}</td><td>${assessmentDate}</td><td>${a.totalMarks || 'N/A'}</td>`;
                    if (isFirstRowOfTargetGroup) {
                        allRowsHtml += `<td rowspan="${targetAssessments.length}" style="vertical-align: middle; text-align: center;">${targetDisplay}</td>`;
                    }
                    allRowsHtml += `<td>${duration}</td><td>${topics}</td></tr>`;
                    isFirstRowOfTerm = false;
                    isFirstRowOfTargetGroup = false;
                });
            });
        });

        const singleTableContent = `
            <table class="data-table" style="margin-top: 1rem;">
                ${tableHeaders}
                <tbody>${allRowsHtml}</tbody>
            </table>
        `;

        // NEW: Signature block to be added at the end of the document
        const signatureBlock = `
            <div style="margin-top: 60px; font-size: 1em; page-break-inside: avoid;">
                <div style="display: table; width: 100%; border-spacing: 20px 0; border-collapse: separate;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; width: 33%; border-top: 1px solid #333; padding-top: 8px;">${educatorName}</div>
                        <div style="display: table-cell; width: 33%; border-top: 1px solid #333; padding-top: 8px;">${hodName}</div>
                        <div style="display: table-cell; width: 33%; border-top: 1px solid #333; padding-top: 8px;">${principalName}</div>
                    </div>
                </div>
                <div style="margin-top: 40px; float: right;">
                    <div style="border: 1px solid #333; height: 120px; width: 200px; display: flex; align-items: center; justify-content: center; color: #aaa;">
                        School Stamp
                    </div>
                </div>
            </div>`;
    
        const printHeader = `
            <div id="ap-print-header">
                <img src="${schoolLogoPath}" alt="School Logo" style="max-width: 80px; margin-bottom: 10px;">
                <h1>${schoolName}</h1>
                <p>Programme of Assessment - ${currentYear}</p>
                <p><strong>Educator:</strong> ${educatorName}</p>
                <p><strong>Grade: ${grade}</strong></p>
                <p><strong>Subject: ${subject}</strong></p>
            </div>
        `;
    
        return printHeader + (filteredAssessments.length > 0 ? singleTableContent + signatureBlock : `<p>No assessments have been scheduled for ${grade} - ${subject}.</p>`);
    }

    /**
     * Exports the selected assessment programme to a PDF (via browser print dialog).
     * @param {object} userData - The authenticated teacher's data.
     * @param {string} subject - The subject to filter by.
     * @param {string} grade - The grade to filter by.
     */
    async function exportToPdf(userData, subject, grade) {
        const printContent = await generateProgrammeHtml(userData, subject, grade);
        // Create a temporary iframe to print
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <html><head>
                <title>Print Assessment Programme</title>
                <style>
                    body { font-family: sans-serif; }
                    #ap-print-header {
                        text-align: center;
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 1rem;
                        margin-bottom: 1.5rem;
                    }
                    #ap-print-header img { max-width: 80px; margin-bottom: 10px; }
                    #ap-print-header h1 { font-size: 1.5em; margin: 0; color: #333; }
                    #ap-print-header p { font-size: 0.9em; margin: 0.2em 0; }

                    .data-table {
                        border-collapse: collapse;
                        width: 100%;
                        font-size: 0.9em;
                    }
                    .data-table th,
                    .data-table td {
                        border: 1px solid #333 !important;
                        padding: 8px;
                        text-align: left;
                    }
                    .data-table th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    p {
                        font-size: 1em;
                    }
                </style>
            </head><body>${printContent}</body></html>
        `);
        doc.close();

        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        // Clean up after a delay
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }

    /**
     * Exports the selected assessment programme to a basic Word (.doc) file.
     * @param {object} userData - The authenticated teacher's data.
     * @param {string} subject - The subject to filter by.
     * @param {string} grade - The grade to filter by.
     */
    async function exportToWord(userData, subject, grade) {
        const contentHtml = await generateProgrammeHtml(userData, subject, grade);
        // Word requires inline styles for the table, which are already present in the embedded style block.
        const styles = `
            <style>
                body { font-family: sans-serif; }
                #ap-print-header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 1rem; margin-bottom: 1.5rem; }
                #ap-print-header img { max-width: 80px; margin-bottom: 10px; }
                #ap-print-header h1 { font-size: 1.5em; margin: 0; color: #333; }
                #ap-print-header p { font-size: 0.9em; margin: 0.2em 0; }
                .data-table { border-collapse: collapse; width: 100%; font-size: 0.9em; }
                .data-table th, .data-table td { border: 1px solid #333; padding: 8px; text-align: left; }
                .data-table th { background-color: #f2f2f2; font-weight: bold; }
            </style>
        `;
        const fullHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Assessment Programme</title>${styles}</head>
            <body>${contentHtml}</body></html>`;
        const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Assessment_Programme_${grade}_${subject}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
