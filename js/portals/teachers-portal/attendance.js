// js/portals/teachers-portal/attendance.js

/**
 * Gets the ISO week number for a given date.
 * @param {Date} d - The date.
 * @returns {number} The ISO week number.
 */
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Helper to get the Monday of an ISO week.
 */
function getDateOfISOWeek(w, y) {
    var simple = new Date(y, 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

/**
 * Overhauls the attendance register to support a weekly view.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The current teacher's user data, including responsibleClass.
 */
function setupAttendanceRegister(db, teacherData) {
    const classSelect = document.getElementById('attendance-class-select');
    const tableBody = document.getElementById('attendance-table-body');
    const weekDisplay = document.getElementById('attendance-week-display');
    const yearFilter = document.getElementById('attendance-year-filter');
    const termFilter = document.getElementById('attendance-term-filter');
    const weekFilter = document.getElementById('attendance-week-filter');

    if (!classSelect || !tableBody || !yearFilter || !termFilter || !weekFilter) return;

    classSelect.innerHTML = '<option value="">-- Select Class --</option>';

    // **MODIFIED**: Only show the responsible class as requested, and do not auto-select.
    if (teacherData.responsibleClass) {
        classSelect.disabled = false;
        classSelect.add(new Option(`Class ${teacherData.responsibleClass}`, teacherData.responsibleClass));
        classSelect.value = ""; // Ensure it defaults to the placeholder
    } else {
        classSelect.innerHTML = '<option value="">No Responsible Class</option>';
        classSelect.disabled = true;
        tableBody.innerHTML = `<tr><td colspan="7" class="info-message">You are not assigned as a Class Teacher.</td></tr>`;
        return;
    }

    // --- Initialize Filters ---
    const currentYear = new Date().getFullYear();
    const currentWeek = getWeekNumber(new Date());
    
    // Populate Year
    yearFilter.innerHTML = '';
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        yearFilter.add(new Option(y, y, y === currentYear, y === currentYear));
    }

    // Helper to populate weeks based on term
    const populateWeeks = () => {
        const term = parseInt(termFilter.value);
        const year = parseInt(yearFilter.value);
        const termBoundaries = {
            1: { start: 1, end: 13 },
            2: { start: 14, end: 26 },
            3: { start: 27, end: 39 },
            4: { start: 40, end: 53 }
        };
        const { start, end } = termBoundaries[term];
        
        weekFilter.innerHTML = '';
        let selectedWeek = null;

        for (let w = start; w <= end; w++) {
            const monday = getDateOfISOWeek(w, year);
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            
            const startStr = `${monday.getDate()} ${monday.toLocaleString('default', { month: 'short' })}`;
            const endStr = `${friday.getDate()} ${friday.toLocaleString('default', { month: 'short' })}`;
            
            const option = new Option(`Week ${w} (${startStr} - ${endStr})`, w);
            weekFilter.add(option);

            // Default to current week if within range
            if (year === currentYear && w === currentWeek) selectedWeek = w;
        }
        
        if (selectedWeek) weekFilter.value = selectedWeek;
    };

    // Initial population
    // Determine current term based on current week
    if (currentWeek >= 1 && currentWeek <= 13) termFilter.value = 1;
    else if (currentWeek >= 14 && currentWeek <= 26) termFilter.value = 2;
    else if (currentWeek >= 27 && currentWeek <= 39) termFilter.value = 3;
    else termFilter.value = 4;
    
    populateWeeks();

    // --- Load Data Function ---
    const loadAttendanceData = async () => {
        const selectedClass = classSelect.value;
        const year = parseInt(yearFilter.value);
        const weekNumber = parseInt(weekFilter.value);

        // Update Headers with Dates
        const mondayDate = getDateOfISOWeek(weekNumber, year);
        const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        days.forEach((d, index) => {
            const date = new Date(mondayDate);
            date.setDate(mondayDate.getDate() + index);
            const dateStr = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
            const th = document.getElementById(`th-${d}`);
            if (th) th.textContent = `${dayNames[index]} (${dateStr})`;
        });

        weekDisplay.textContent = `Showing Attendance for: Week ${weekNumber}, ${year}`;

        if (!selectedClass) {
            tableBody.innerHTML = `<tr><td colspan="7" class="info-message">Please select a class to view the attendance register.</td></tr>`;
            return;
        }

        tableBody.innerHTML = `<tr><td colspan="7" class="info-message"><i class="fas fa-sync fa-spin"></i> Loading learners and attendance...</td></tr>`;

        try {
            const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', selectedClass).get();
            if (learnersSnapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="7" class="info-message">No learners found for this class.</td></tr>`;
                return;
            }
            const learners = learnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            sortLearnersByName(learners);

            const learnerIds = learners.map(l => l.id);
            const attendanceMap = new Map();

            if (learnerIds.length > 0) {
                const promises = [];
                for (let i = 0; i < learnerIds.length; i += 10) {
                    const chunk = learnerIds.slice(i, i + 10);
                    promises.push(
                        db.collection('weekly_attendance')
                            .where('year', '==', year)
                            .where('weekNumber', '==', weekNumber)
                            .where('learnerId', 'in', chunk)
                            .get()
                    );
                }
                const snapshots = await Promise.all(promises);
                snapshots.forEach(snapshot => {
                    snapshot.forEach(doc => {
                        attendanceMap.set(doc.data().learnerId, doc.data().attendance);
                    });
                });
            }

            let tableRowsHTML = '';
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            learners.forEach(learner => {
                const learnerAttendance = attendanceMap.get(learner.id) || {};
                tableRowsHTML += `<tr data-learner-id="${learner.id}" data-admission-id="${learner.admissionId}" data-learner-name="${formatLearnerName(learner)}">`;
                tableRowsHTML += `<td>${learner.admissionId || 'N/A'}</td><td>${formatLearnerName(learner)}</td>`;
                days.forEach(day => {
                    const status = learnerAttendance[day] || 'present';
                    tableRowsHTML += `
                        <td>
                            <div class="attendance-status-container">
                                <input type="radio" id="${learner.id}-${day}-present" name="${learner.id}-${day}" value="present" ${status === 'present' ? 'checked' : ''}>
                                <label for="${learner.id}-${day}-present" class="status-present">P</label>
                                <input type="radio" id="${learner.id}-${day}-absent" name="${learner.id}-${day}" value="absent" ${status === 'absent' ? 'checked' : ''}>
                                <label for="${learner.id}-${day}-absent" class="status-absent">A</label>
                            </div>
                        </td>`;
                });
                tableRowsHTML += `</tr>`;
            });
            tableBody.innerHTML = tableRowsHTML;
        } catch (error) {
            console.error("Error loading weekly attendance:", error);
            tableBody.innerHTML = `<tr><td colspan="7" class="error-message">Failed to load attendance. Please try again.</td></tr>`;
        }
    };

    // Event Listeners
    classSelect.addEventListener('change', loadAttendanceData);
    yearFilter.addEventListener('change', () => { populateWeeks(); loadAttendanceData(); });
    termFilter.addEventListener('change', () => { populateWeeks(); loadAttendanceData(); });
    weekFilter.addEventListener('change', loadAttendanceData);
}

/**
 * Handles the submission of the weekly attendance form.
 * @param {HTMLFormElement} form - The attendance form element.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function setupAttendanceFormListener(form, db) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const statusMessage = document.getElementById('attendance-submit-status');
        const selectedClass = document.getElementById('attendance-class-select').value;
        const year = parseInt(document.getElementById('attendance-year-filter').value);
        const weekNumber = parseInt(document.getElementById('attendance-week-filter').value);

        if (!selectedClass) {
            alert("Please select a class before submitting.");
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';

        const batch = db.batch();
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

        document.querySelectorAll('#attendance-table-body tr').forEach(row => {
            const learnerId = row.dataset.learnerId;
            if (!learnerId) return;

            const attendance = {};
            days.forEach(day => {
                attendance[day] = row.querySelector(`input[name="${learnerId}-${day}"]:checked`).value;
            });

            const docId = `${year}-W${weekNumber}_${learnerId}`;
            const docRef = db.collection('weekly_attendance').doc(docId);
            batch.set(docRef, { year, weekNumber, learnerId, fullGradeSection: selectedClass, admissionId: row.dataset.admissionId, learnerName: row.dataset.learnerName, attendance, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        });

        try {
            await batch.commit();
            statusMessage.textContent = 'Weekly attendance saved successfully!';
            statusMessage.className = 'status-message-box success';
        } catch (error) {
            console.error("Error saving weekly attendance:", error);
            statusMessage.textContent = 'An error occurred while saving. Please try again.';
            statusMessage.className = 'status-message-box error';
        } finally {
            statusMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Submit Attendance';
        }
    });
}