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

// **NEW**: Add variables to store the full list of learners and their attendance data for the current class
let currentAttendanceLearners = [];
let currentAttendanceMap = new Map();

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
    const searchInput = document.getElementById('attendance-search');
    const clearSearchBtn = document.getElementById('clear-attendance-search-btn');
    const printBtn = document.getElementById('print-attendance-btn');
    const exportExcelBtn = document.getElementById('export-attendance-excel-btn');

    if (!classSelect || !tableBody || !yearFilter || !termFilter || !weekFilter || !searchInput || !clearSearchBtn || !printBtn || !exportExcelBtn) return;

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

        // Reset search when loading new data
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';

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

        // **NEW**: Update the print-only header with current info
        const printInfo = document.getElementById('attendance-print-info');
        if (printInfo) {
            printInfo.textContent = `Class: ${selectedClass} | Week: ${weekNumber}, ${year}`;
        }

        if (!selectedClass) {
            tableBody.innerHTML = `<tr><td colspan="7" class="info-message">Please select a class to view the attendance register.</td></tr>`;
            return;
        }

        tableBody.innerHTML = `<tr><td colspan="7" class="info-message"><i class="fas fa-sync fa-spin"></i> Loading learners and attendance...</td></tr>`;

        try {
            const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', selectedClass).get();
            if (learnersSnapshot.empty) {
                currentAttendanceLearners = [];
                renderAttendanceTable([], new Map());
                return;
            }
            const learners = learnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            sortLearnersByName(learners);
            currentAttendanceLearners = learners; // Store the full list

            const learnerIds = learners.map(l => l.id);
            currentAttendanceMap.clear(); // Use the module-scoped map

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
                        currentAttendanceMap.set(doc.data().learnerId, doc.data().attendance);
                    });
                });
            }

            renderAttendanceTable(currentAttendanceLearners, currentAttendanceMap);
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

    // **NEW**: Search event listeners
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchTerm ? 'block' : 'none';

        const filteredLearners = currentAttendanceLearners.filter(learner => {
            const fullName = formatLearnerName(learner).toLowerCase();
            const admissionId = String(learner.admissionId || '').toLowerCase();
            return fullName.includes(searchTerm) || admissionId.includes(searchTerm);
        });

        renderAttendanceTable(filteredLearners, currentAttendanceMap);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.focus();
    });

    // **NEW**: Print button event listener
    printBtn.addEventListener('click', () => {
        const tableBody = document.getElementById('attendance-table-body');
        const rowsToHide = [];

        // Temporarily hide rows for learners who were present all week
        tableBody.querySelectorAll('tr').forEach(row => {
            if (!row.dataset.learnerId) return;
            const isAbsentOrLate = row.querySelector('input[value="absent"]:checked, input[value="late"]:checked');
            if (!isAbsentOrLate) {
                row.classList.add('no-print');
                rowsToHide.push(row);
            }
        });

        // Define a cleanup function to run after printing
        const cleanup = () => {
            rowsToHide.forEach(row => row.classList.remove('no-print'));
            window.removeEventListener('afterprint', cleanup);
        };

        window.addEventListener('afterprint', cleanup);
        window.print();
    });

    // **NEW**: Excel export button event listener
    exportExcelBtn.addEventListener('click', () => {
        exportAttendanceToExcel();
    });
}

/**
 * **NEW**: Calculates and updates the summary row counts based on the current state of the radio buttons in the table.
 */
function updateAttendanceSummary() {
    const tableBody = document.getElementById('attendance-table-body');
    if (!tableBody) return;

    const absenteeCounts = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 };
    const lateCounts = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 };

    // Find all checked 'absent' radios in one go
    const absentRadios = tableBody.querySelectorAll('input[value="absent"]:checked');
    const lateRadios = tableBody.querySelectorAll('input[value="late"]:checked');

    absentRadios.forEach(radio => {
        // The name is like "learnerId-day"
        const nameParts = radio.name.split('-');
        const day = nameParts[nameParts.length - 1]; // last part is the day ('monday', 'tuesday', etc.)
        if (absenteeCounts.hasOwnProperty(day)) {
            absenteeCounts[day]++;
        }
    });

    lateRadios.forEach(radio => {
        const nameParts = radio.name.split('-');
        const day = nameParts[nameParts.length - 1];
        if (lateCounts.hasOwnProperty(day)) {
            lateCounts[day]++;
        }
    });

    document.getElementById('summary-mon').textContent = absenteeCounts.monday;
    document.getElementById('summary-tue').textContent = absenteeCounts.tuesday;
    document.getElementById('summary-wed').textContent = absenteeCounts.wednesday;
    document.getElementById('summary-thu').textContent = absenteeCounts.thursday;
    document.getElementById('summary-fri').textContent = absenteeCounts.friday;

    document.getElementById('summary-late-mon').textContent = lateCounts.monday;
    document.getElementById('summary-late-tue').textContent = lateCounts.tuesday;
    document.getElementById('summary-late-wed').textContent = lateCounts.wednesday;
    document.getElementById('summary-late-thu').textContent = lateCounts.thursday;
    document.getElementById('summary-late-fri').textContent = lateCounts.friday;
}

/**
 * **NEW**: Renders the attendance table rows based on a list of learners and their attendance data.
 * @param {Array} learners - The array of learner objects to render.
 * @param {Map} attendanceMap - The map of attendance data.
 */
function renderAttendanceTable(learners, attendanceMap) {
    const tableBody = document.getElementById('attendance-table-body');
    const searchInput = document.getElementById('attendance-search');
    const footer = document.getElementById('attendance-summary-footer');

    if (learners.length === 0) {
        if (footer) footer.style.display = 'none';
        tableBody.innerHTML = (searchInput && searchInput.value)
            ? `<tr><td colspan="7" class="info-message">No learners match your search.</td></tr>`
            : `<tr><td colspan="7" class="info-message">No learners found for this class.</td></tr>`;
        return;
    }

    if (footer) footer.style.display = 'table-footer-group';

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const tableRowsHTML = learners.map(learner => {
        const learnerAttendance = attendanceMap.get(learner.id) || {};
        
        // Calculate initial absence count for highlighting
        let absenceCount = 0;
        days.forEach(day => {
            if (learnerAttendance[day] === 'absent') absenceCount++;
        });
        const rowStyle = absenceCount >= 3 ? 'style="background-color: #fee2e2;"' : '';

        const dayCells = days.map(day => {
            const status = learnerAttendance[day] || 'present';
            return `<td><div class="attendance-status-container">
                        <input type="radio" id="${learner.id}-${day}-present" name="${learner.id}-${day}" value="present" ${status === 'present' ? 'checked' : ''}>
                        <label for="${learner.id}-${day}-present" class="status-present">P</label>
                        <input type="radio" id="${learner.id}-${day}-absent" name="${learner.id}-${day}" value="absent" ${status === 'absent' ? 'checked' : ''}>
                        <label for="${learner.id}-${day}-absent" class="status-absent">A</label>
                        <input type="radio" id="${learner.id}-${day}-late" name="${learner.id}-${day}" value="late" ${status === 'late' ? 'checked' : ''}>
                        <label for="${learner.id}-${day}-late" class="status-late">L</label>
                    </div></td>`;
        }).join('');

        return `<tr data-learner-id="${learner.id}" data-admission-id="${learner.admissionId}" data-learner-name="${formatLearnerName(learner)}" ${rowStyle}><td>${learner.admissionId || 'N/A'}</td><td>${formatLearnerName(learner)}</td>${dayCells}</tr>`;
    }).join('');

    tableBody.innerHTML = tableRowsHTML;

    // NEW: Update summary and add listeners for real-time updates
    updateAttendanceSummary();
    tableBody.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateAttendanceSummary();
            updateLearnerRiskStatus(e.target.closest('tr'));
        });
    });
}

/**
 * Updates the visual highlight of a row based on absence count (3 or more).
 * @param {HTMLTableRowElement} row - The table row to check.
 */
function updateLearnerRiskStatus(row) {
    if (!row) return;
    const absentCount = row.querySelectorAll('input[value="absent"]:checked').length;
    if (absentCount >= 3) {
        row.style.backgroundColor = '#fee2e2'; // Light red highlight
    } else {
        row.style.backgroundColor = ''; // Reset
    }
}

/**
 * **NEW**: Exports the current attendance view to an Excel file using SheetJS,
 * filtering for only absent and late learners.
 */
function exportAttendanceToExcel() {
    const classSelect = document.getElementById('attendance-class-select');
    const weekFilter = document.getElementById('attendance-week-filter');
    const yearFilter = document.getElementById('attendance-year-filter');
    const tableBody = document.getElementById('attendance-table-body');
 
    const className = classSelect.value;
    const week = weekFilter.value;
    const year = yearFilter.value;
 
    if (!className || tableBody.rows.length === 0 || (tableBody.rows.length === 1 && tableBody.rows[0].cells.length === 1)) {
        alert("No attendance data to export. Please load a class register first.");
        return;
    }
 
    const dataForExport = [];
 
    // 1. Headers
    const headers = [
        'Admission No.', 'Learner Name',
        document.getElementById('th-mon').textContent,
        document.getElementById('th-tue').textContent,
        document.getElementById('th-wed').textContent,
        document.getElementById('th-thu').textContent,
        document.getElementById('th-fri').textContent
    ];
    dataForExport.push(headers);
 
    // 2. Learner Rows - Filtered for Absentees and Lates
    const learnerRows = tableBody.querySelectorAll('tr');
    let absenteeCount = 0;
    learnerRows.forEach(row => {
        const learnerId = row.dataset.learnerId;
        if (!learnerId) return;
 
        const statuses = [];
        let isAbsentOrLate = false;
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        days.forEach(day => {
            const statusInput = row.querySelector(`input[name="${learnerId}-${day}"]:checked`);
            const statusValue = statusInput ? statusInput.value : 'present';
            if (statusValue === 'absent' || statusValue === 'late') {
                isAbsentOrLate = true;
            }
            statuses.push(statusValue.charAt(0).toUpperCase());
        });
 
        if (isAbsentOrLate) {
            absenteeCount++;
            const admissionId = row.cells[0].textContent;
            const learnerName = row.cells[1].textContent;
            dataForExport.push([admissionId, learnerName, ...statuses]);
        }
    });
 
    if (absenteeCount === 0) {
        alert("No learners were absent or late in this period. Nothing to export.");
        return;
    }
 
    // 3. Add summary rows to the export
    dataForExport.push([]); // Add a blank row for spacing
    const summaryAbsentees = ['Total Absentees', ''];
    const summaryLates = ['Total Lates', ''];
    const summaryDays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    summaryDays.forEach(day => {
        summaryAbsentees.push(document.getElementById(`summary-${day}`).textContent);
        summaryLates.push(document.getElementById(`summary-late-${day}`).textContent);
    });
    dataForExport.push(summaryAbsentees);
    dataForExport.push(summaryLates);
 
    // 4. Generate Excel file
    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
 
    // Auto-fit columns for better readability
    const colWidths = headers.map((_, i) => ({
        wch: Math.max(...dataForExport.map(row => row[i] ? row[i].toString().length : 0)) + 2
    }));
    worksheet['!cols'] = colWidths;
 
    const fileName = `Absentee_Report_${className}_${year}_W${week}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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