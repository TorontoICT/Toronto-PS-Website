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
 * Overhauls the attendance register to support a weekly view.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The current teacher's user data, including responsibleClass.
 */
function setupAttendanceRegister(db, teacherData) {
    const classSelect = document.getElementById('attendance-class-select');
    const tableBody = document.getElementById('attendance-table-body');
    const weekDisplay = document.getElementById('attendance-week-display');

    if (!classSelect || !tableBody) return;

    classSelect.innerHTML = '<option value="">-- Select a Class to Load Roster --</option>';

    if (teacherData.isClassTeacher && teacherData.responsibleClass) {
        classSelect.add(new Option(`Class: ${teacherData.responsibleClass}`, teacherData.responsibleClass));
        classSelect.value = teacherData.responsibleClass;
        classSelect.dispatchEvent(new Event('change'));
    } else {
        classSelect.innerHTML = '<option value="">Not assigned as a Class Teacher</option>';
        classSelect.disabled = true;
        tableBody.innerHTML = `<tr><td colspan="7" class="info-message">You are not assigned as a Class Teacher, or your responsible class is not set.</td></tr>`;
        return;
    }

    classSelect.addEventListener('change', async (e) => {
        const selectedClass = e.target.value;
        const today = new Date();
        const year = today.getFullYear();
        const weekNumber = getWeekNumber(today);

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
    });
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

        if (!selectedClass) {
            alert("Please select a class before submitting.");
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';

        const batch = db.batch();
        const today = new Date();
        const year = today.getFullYear();
        const weekNumber = getWeekNumber(today);
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