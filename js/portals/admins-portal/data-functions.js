// scripts/data-functions.js

// NOTE: This script relies on global variables (db, auth, lastVisibleAll, PAGE_SIZE, 
// selectedLearnerData, selectedTeacherData, lastVisibleTeachers, lastVisibleUnassigned, 
// lastVisibleAssigned, activeAssignmentView) being defined in firebase-config.js/global scope, 
// and UI functions (e.g., showSamsDetails, createKebabMenu, createTeacherKebabMenu, 
// handleNavigation, displayLearnerAssignmentTool) being defined in ui-handlers.js.

// =========================================================
// === SA-SAMS MANAGEMENT FUNCTIONS (ACCEPTED APPLICATIONS) ===
// =========================================================

async function loadSamsRegistrations() {
    const tableBody = document.querySelector('#sams-data-table tbody');
    const statusMessage = document.getElementById('sams-data-status');
    
    tableBody.innerHTML = '';
    statusMessage.textContent = 'Fetching accepted applications...';
    
    const uniqueApplications = new Set();
    let applicationCount = 0;

    try {
        const snapshot = await db.collection('sams_registrations').get();

        if (snapshot.empty) {
            statusMessage.textContent = 'No accepted applications found yet.';
            return;
        }

        // Sort the results by surname (learnerName) before rendering
        const sortedDocs = snapshot.docs.sort((a, b) => (a.data().learnerName || '').localeCompare(b.data().learnerName || ''));

        sortedDocs.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            if (!admissionId) { // Removed unique check as sorting handles display order
                return;
            }
            uniqueApplications.add(admissionId);

            const row = tableBody.insertRow();
            
            let importedDate = 'N/A';
            if (data.importedAt && typeof data.importedAt.toDate === 'function') {
                importedDate = data.importedAt.toDate().toLocaleDateString();
            } else if (data.importedAt) {
                importedDate = new Date(data.importedAt).toLocaleDateString();
            }

            row.insertCell().textContent = admissionId;
            row.insertCell().textContent = `${data.learnerName} ${data.learnerSurname}`;
            row.insertCell().textContent = data.fullGradeSection || data.grade; 
            row.insertCell().textContent = data.parent1Email;
            row.insertCell().textContent = importedDate;
            
            const actionCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Details';
            viewButton.className = 'cta-button-small'; 
            
            // NOTE: showSamsDetails should navigate to learner details
            viewButton.onclick = () => showSamsDetails(data, 'sams-learners'); 
            actionCell.appendChild(viewButton);

            applicationCount++;
        });

        statusMessage.textContent = `Successfully loaded ${applicationCount} accepted application(s).`;
        
    } catch (error) {
        console.error("Error loading SA-SAMS data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}

/**
 * Loads all current and upcoming announcements into the management list.
 */
async function loadAnnouncementsForManagement() {
    const container = document.getElementById('current-announcements-list');
    if (!container) return;

    container.innerHTML = '<p class="data-status-message" id="current-announcements-status">Loading announcements...</p>';

    try {
        const snapshot = await db.collection('announcements').orderBy('date', 'desc').get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="data-status-message">No current or upcoming announcements found.</p>';
            return;
        }

        let announcementsHTML = '<ul class="resource-list">';
        snapshot.forEach(doc => {
            const announcement = doc.data();
            const announcementId = doc.id;
            announcementsHTML += `
                <li data-id="${announcementId}" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${announcement.title}</strong> (Display Date: ${announcement.date})
                        <p style="font-size: 0.9em; color: #666; margin-top: 4px;">${(announcement.content || '').substring(0, 100)}...</p>
                    </div>
                    <button class="cta-button-small danger" onclick="deleteAnnouncement('${announcementId}', '${announcement.title.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </li>
            `;
        });
        announcementsHTML += '</ul>';

        container.innerHTML = announcementsHTML;

    } catch (error) {
        console.error("Error loading announcements for management:", error);
        container.innerHTML = '<p class="data-status-message error">Could not load announcements.</p>';
    }
}

/**
 * Deletes a specific announcement from Firestore after confirmation.
 * @param {string} announcementId - The ID of the announcement document to delete.
 * @param {string} announcementTitle - The title of the announcement for the confirmation dialog.
 */
window.deleteAnnouncement = async (announcementId, announcementTitle) => {
    if (confirm(`Are you sure you want to permanently delete the announcement titled "${announcementTitle}"?`)) {
        try {
            await db.collection('announcements').doc(announcementId).delete();
            alert('Announcement deleted successfully.');
            loadAnnouncementsForManagement(); // Refresh the list
        } catch (error) {
            console.error("Error deleting announcement:", error);
            alert('Failed to delete the announcement. Please try again.');
        }
    }
};

// =========================================================
// === LEARNER MANAGEMENT SYSTEM (LMS) LIST FUNCTIONS ===
// =========================================================

/**
 * Queries Firebase for all active learners for the LMS list view.
 */
async function loadAllActiveLearners(filterGrade = 'All', reset = false) {
    const tableContainer = document.getElementById('all-active-learners-list');
    const tableBody = document.querySelector('#active-learners-table tbody');
    const statusMessage = document.getElementById('active-learners-status');
    const detailsContainer = document.getElementById('learner-details-display');
    
    let loadMoreBtn = document.getElementById('load-more-all-btn');

    detailsContainer.style.display = 'none';
    tableContainer.closest('.portal-section').style.display = 'block'; // Ensure section is visible

    if (reset) {
        tableBody.innerHTML = '';
        lastVisibleAll = null;
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
    
    statusMessage.textContent = `Fetching active learners for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}...`;
    
    try {
        let query = db.collection('sams_registrations');
        
        if (filterGrade !== 'All') {
            let gradeValue;
            if (filterGrade === 'R') {
                gradeValue = 'R'; 
            } else {
                gradeValue = parseInt(filterGrade, 10); 
            }
            query = query.where('grade', '==', gradeValue); 
        }
        
        query = query.orderBy('admissionId');

        if (lastVisibleAll) {
            query = query.startAfter(lastVisibleAll);
        }

        const snapshot = await query.limit(PAGE_SIZE).get(); 

        if (snapshot.empty && tableBody.rows.length === 0) {
            statusMessage.textContent = `No active learners found for Grade ${filterGrade}.`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        const existingAdmissionIds = new Set(Array.from(tableBody.querySelectorAll('tr')).map(row => row.getAttribute('data-id')));
        
        // Sort the fetched documents by surname (learnerName) before displaying
        const sortedDocs = snapshot.docs.sort((a, b) => (a.data().learnerName || '').localeCompare(b.data().learnerName || ''));

        sortedDocs.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            // **FIX**: Added a check to ensure the admissionId is not null or undefined before proceeding.
            // This prevents potential errors if a record is malformed.
            if (!admissionId || existingAdmissionIds.has(admissionId)) {
                 return;
            }
            
            const row = tableBody.insertRow();
            row.setAttribute('data-id', admissionId); 
            
            // **FIX**: Add an empty cell for the checkbox column to align data correctly.
            row.insertCell();

            row.insertCell().textContent = admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.fullGradeSection || data.grade; 
            
            const actionCell = row.insertCell();
            actionCell.appendChild(createKebabMenu(data));
        });
        
        if (!snapshot.empty) {
            lastVisibleAll = snapshot.docs[snapshot.docs.length - 1];
        }

        if (loadMoreBtn) {
            if (snapshot.docs.length < PAGE_SIZE) {
                loadMoreBtn.style.display = 'none'; 
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
        }
        
        const currentTotal = tableBody.rows.length;
        statusMessage.textContent = `Displaying ${currentTotal} active learner(s) for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}.`;

    } catch (error) {
        console.error("Error loading All Active Learners data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}

// =========================================================
// === GRADE SECTIONS VIEW FUNCTIONS ===
// =========================================================

/**
 * Loads and displays learners based on grade and optional class section filters.
 * @param {string} grade - The grade to filter by.
 * @param {string} classSection - The class section to filter by ('All' for no filter).
 */
async function loadLearnersByGradeAndClass(grade, classSection = 'All') {
    const tableBody = document.querySelector('#grade-section-learners-table tbody');
    const statusMessage = document.getElementById('grade-section-learners-status');
    const header = document.getElementById('grade-section-header');

    tableBody.innerHTML = '';

    if (!grade) {
        header.textContent = 'Select a Grade to Begin';
        statusMessage.textContent = 'Please select a grade from the filter above.';
        return;
    }

    let headerText = `Loading Learners for Grade ${grade}`;
    if (classSection !== 'All') {
        headerText += `, Class ${classSection}`;
    }
    header.textContent = headerText + '...';
    statusMessage.textContent = 'Fetching learner data...';

    try {
        const gradeValue = (grade === 'R') ? 'R' : parseInt(grade, 10);
        let query = db.collection('sams_registrations').where('grade', '==', gradeValue);

        if (classSection !== 'All') {
            query = query.where('section', '==', classSection);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            header.textContent = `No Learners Found for Grade ${grade}` + (classSection !== 'All' ? ` in Class ${classSection}` : '');
            statusMessage.textContent = 'There are no learners matching the current filter criteria.';
            return;
        }

        let learnerCount = 0;
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const nameA = `${a.data().learnerName || ''} ${a.data().learnerSurname || ''}`;
            const nameB = `${b.data().learnerName || ''} ${b.data().learnerSurname || ''}`;
            return nameA.localeCompare(nameB);
        });

        sortedDocs.forEach(doc => {
            const data = doc.data();
            const row = tableBody.insertRow();
            row.insertCell().textContent = data.admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.fullGradeSection || data.grade;
            learnerCount++;
        });

        header.textContent = `Displaying Learners for Grade ${grade}` + (classSection !== 'All' ? `, Class ${classSection}` : '');
        statusMessage.textContent = `Found ${learnerCount} learner(s).`;

    } catch (error) {
        console.error(`Error loading learners for Grade ${grade}:`, error);
        header.textContent = `Error Loading Data`;
        statusMessage.textContent = 'An error occurred. Check the console for details.';
        if (error.code === 'failed-precondition') {
            statusMessage.innerHTML += '<br><strong>Action Required:</strong> This query may require a composite index. Please check the browser console for a link to create it in Firebase.';
        }
    }
}

/**
 * Finds and automatically deletes announcements with a date in the past.
 * This runs in the background when the admin portal is loaded.
 */
async function deletePastAnnouncements() {
    console.log("Checking for expired announcements to delete...");

    // Get today's date at midnight for a clean comparison.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Convert today's date to a Firestore Timestamp for querying.
    const todayTimestamp = firebase.firestore.Timestamp.fromDate(today);

    try {
        // Query for announcements where the expiration date is before today.
        const snapshot = await db.collection('announcements')
            .where('expiresAt', '<', todayTimestamp)
            .get();

        if (snapshot.empty) {
            console.log("No expired announcements found to delete.");
            return;
        }

        console.log(`Found ${snapshot.size} expired announcement(s).`);

        // Use a batch to delete all found documents efficiently.
        const batch = db.batch();
        snapshot.forEach(doc => {
            console.log(`Queueing deletion for announcement: ${doc.id} ('${doc.data().title}')`);
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Successfully deleted ${snapshot.size} expired announcement(s).`);

    } catch (error) {
        console.error("Error deleting expired announcements:", error);
    }
}

// =========================================================
// === GRADE ASSIGNMENT TOOL DATA FUNCTIONS ===
// =========================================================

async function loadUnassignedLearners(filterGrade = 'All', reset = false) {
    const tableBody = document.querySelector('#unassigned-learners-table tbody');
    const statusMessage = document.getElementById('unassigned-learners-status');
    const listContainer = document.getElementById('unassigned-learners-list');
    
    let loadMoreBtn = document.getElementById('load-more-unassigned-btn');

    if (reset) {
        tableBody.innerHTML = '';
        lastVisibleUnassigned = null;
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
    }

    // FIX: Always clear the table body to prevent duplicates on re-load.
    tableBody.innerHTML = '';

    if(listContainer.style.display !== 'block') return;

    statusMessage.textContent = `Fetching unassigned learners for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}...`;
    
    try {
        let query = db.collection('sams_registrations').orderBy('admissionId');
        
        if (lastVisibleUnassigned) {
            query = query.startAfter(lastVisibleUnassigned);
        }
        
        const snapshot = await query.limit(PAGE_SIZE * 5).get();
        
        if (snapshot.empty && tableBody.rows.length === 0) {
            statusMessage.textContent = `No unassigned learners found yet.`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        let learnersData = [];
        const existingAdmissionIds = new Set(Array.from(tableBody.querySelectorAll('tr')).map(row => row.cells[0].textContent));
        const uniqueLearners = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            if (existingAdmissionIds.has(admissionId) || uniqueLearners.has(admissionId)) {
                 return;
            }
            uniqueLearners.add(admissionId);
            
            const isUnassigned = data.section === 'Unassigned' || !data.section || data.section.trim() === '';
            
            if (isUnassigned) {
                learnersData.push(data);
            }
        });

        const filteredLearners = learnersData.filter(data => {
            if (filterGrade === 'All') return true;
            
            let gradeValue = (filterGrade === 'R') ? 'R' : parseInt(filterGrade, 10);
            return data.grade === gradeValue || String(data.grade) === filterGrade;
        });

        // Sort the filtered learners by surname (learnerName)
        const sortedLearners = filteredLearners.sort((a, b) => (a.learnerName || '').localeCompare(b.learnerName || ''));

        const learnersToShow = sortedLearners.slice(0, PAGE_SIZE);

        learnersToShow.forEach(data => {
            const row = tableBody.insertRow();
            // **FIX**: Add an empty cell for the checkbox column to align data correctly.
            row.insertCell();

            row.insertCell().textContent = data.admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.grade; 
            
            const actionCell = row.insertCell();
            const assignButton = document.createElement('button');
            assignButton.textContent = 'Assign Class';
            assignButton.className = 'cta-button-small'; 
            
            assignButton.onclick = () => {
                // NOTE: showSamsDetails is a navigation helper that sets selectedLearnerData
                showSamsDetails(data, 'grade-assignment'); 
            }
            actionCell.appendChild(assignButton);
        });

        if (snapshot.docs.length > 0) {
            lastVisibleUnassigned = snapshot.docs[snapshot.docs.length - 1]; 
        }

        if (loadMoreBtn) {
            if (snapshot.docs.length < (PAGE_SIZE * 5)) { 
                loadMoreBtn.style.display = 'none'; 
            } else {
                 loadMoreBtn.style.display = 'inline-block';
            }
        }

        const currentTotal = tableBody.rows.length;
        statusMessage.textContent = `Displaying ${currentTotal} learner(s) awaiting assignment for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}.`;
        
    } catch (error) {
        console.error("Error loading Unassigned Learners data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}


async function loadAssignedLearners(filterGrade = 'All', reset = false) {
    const tableBody = document.querySelector('#assigned-learners-table tbody');
    const statusMessage = document.getElementById('assigned-learners-status');
    const listContainer = document.getElementById('assigned-learners-list');
    
    let loadMoreBtn = document.getElementById('load-more-assigned-btn');

    if (reset) {
        tableBody.innerHTML = '';
        lastVisibleAssigned = null;
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
    }

    // FIX: Always clear the table body to prevent duplicates on re-load.
    tableBody.innerHTML = '';

    if(listContainer.style.display !== 'block') return;

    statusMessage.textContent = `Fetching assigned learners for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}...`;
    
    try {
        let query = db.collection('sams_registrations').orderBy('admissionId');

        if (lastVisibleAssigned) {
            query = query.startAfter(lastVisibleAssigned);
        }
        
        const snapshot = await query.limit(PAGE_SIZE * 5).get();

        if (snapshot.empty && tableBody.rows.length === 0) {
            statusMessage.textContent = `No assigned learners found yet.`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        let learnersData = [];
        const existingAdmissionIds = new Set(Array.from(tableBody.querySelectorAll('tr')).map(row => row.cells[0].textContent));
        const uniqueLearners = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            if (existingAdmissionIds.has(admissionId) || uniqueLearners.has(admissionId)) {
                 return;
            }
            uniqueLearners.add(admissionId);

            const isAssigned = data.section && data.section.trim() !== '' && data.section !== 'Unassigned';

            if (isAssigned) {
                learnersData.push(data);
            }
        });

        const filteredLearners = learnersData.filter(data => {
            if (filterGrade === 'All') return true;
            
            let gradeValue = (filterGrade === 'R') ? 'R' : parseInt(filterGrade, 10);
            return data.grade === gradeValue || String(data.grade) === filterGrade;
        });
        
        // Sort the filtered learners by surname (learnerName)
        const sortedLearners = filteredLearners.sort((a, b) => (a.learnerName || '').localeCompare(b.learnerName || ''));

        const learnersToShow = sortedLearners.slice(0, PAGE_SIZE);

        learnersToShow.forEach(data => {
            const row = tableBody.insertRow();
            // **FIX**: Add an empty cell for the checkbox column to align data correctly.
            row.insertCell();
            
            row.insertCell().textContent = data.admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.fullGradeSection || data.grade; 
            
            const actionCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'Re-Assign Class';
            viewButton.className = 'cta-button-small'; 
            
            viewButton.onclick = () => {
                showSamsDetails(data, 'grade-assignment'); 
            }
            actionCell.appendChild(viewButton);
        });

        if (snapshot.docs.length > 0) {
             lastVisibleAssigned = snapshot.docs[snapshot.docs.length - 1]; 
        }

        if (loadMoreBtn) {
            if (snapshot.docs.length < (PAGE_SIZE * 5)) { 
                loadMoreBtn.style.display = 'none'; 
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
        }
        
        const currentTotal = tableBody.rows.length;
        statusMessage.textContent = `Displaying ${currentTotal} active assigned learner(s) for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}.`;
        
    } catch (error) {
        console.error("Error loading Assigned Learners data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}

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
 * Fetches and displays weekly absentee records based on a selected date.
 * @param {string} dateString - The date in YYYY-MM-DD format.
 */
async function loadAttendanceRecords(year, term, weekFilter = 'All', classFilter = 'All') {
    const tableBody = document.querySelector('#attendance-records-table tbody');
    const statusMessage = document.getElementById('attendance-records-status');
    const tableHeader = document.getElementById('attendance-table-header-absences');

    tableBody.innerHTML = '';

    if (!year || !term) {
        document.getElementById('attendance-class-filter').disabled = true;
        statusMessage.textContent = 'Please select a year and term to view records.';
        statusMessage.style.display = 'block';
        return;
    }

    document.getElementById('attendance-week-filter').disabled = false;
    document.getElementById('attendance-class-filter').disabled = false;

    // Define the week numbers for the selected term
    const termBoundaries = {
        1: { start: 1, end: 13 },   // Jan-Mar
        2: { start: 14, end: 26 },  // Apr-Jun
        3: { start: 27, end: 39 },  // Jul-Sep
        4: { start: 40, end: 53 }   // Oct-Dec
    };

    let statusText;
    let queryHeaderText;

    if (weekFilter === 'All') {
        statusText = `Fetching absentee records for ${year}, Term ${term}`;
        queryHeaderText = "Total Days Absent This Term";
    } else {
        statusText = `Fetching absentee records for ${year}, Week ${weekFilter}`;
        queryHeaderText = "Absent Days This Week";
    }

    if (classFilter !== 'All') statusText += ` in Class ${classFilter}`;
    statusMessage.textContent = statusText + '...';
    statusMessage.style.display = 'block';
    tableHeader.textContent = queryHeaderText;

    try {
        // Query for all records within the year and week range of the term
        let query = db.collection('weekly_attendance')
            .where('year', '==', parseInt(year));

        if (weekFilter === 'All') {
            const { start: startWeek, end: endWeek } = termBoundaries[term];
            query = query.where('weekNumber', '>=', startWeek).where('weekNumber', '<=', endWeek);
        } else {
            query = query.where('weekNumber', '==', parseInt(weekFilter));
        }
        if (classFilter !== 'All') query = query.where('fullGradeSection', '==', classFilter);

        const finalSnapshot = await query.get();

        // Populate the class filter based on the results
        populateAttendanceClassFilter(finalSnapshot);

        if (finalSnapshot.empty) {
            statusMessage.textContent = `No attendance records found for the selected period.`;
            return;
        }

        // Aggregate absences by learner
        const absenteeData = new Map();

        finalSnapshot.forEach(doc => {
            const data = doc.data();
            const learnerId = data.learnerId;

            const absentDays = Object.entries(data.attendance || {})
                .filter(([, status]) => status === 'absent')
                .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1));

            if (absentDays.length > 0) {
                if (absenteeData.has(learnerId)) {
                    const existing = absenteeData.get(learnerId);
                    if (weekFilter === 'All') {
                        existing.totalAbsences += absentDays.length;
                    }
                    // For single week view, we don't need to aggregate absent days text
                } else {
                    absenteeData.set(learnerId, {
                        admissionId: data.admissionId,
                        learnerName: data.learnerName,
                        fullGradeSection: data.fullGradeSection,
                        totalAbsences: absentDays.length,
                        absentDaysText: absentDays.join(', ')
                    });
                }
            }
        });

        const sortedAbsentees = Array.from(absenteeData.values()).sort((a, b) => {
            const surnameA = (a.learnerName || '').split(' ')[0] || ''; // The first word is the surname
            const surnameB = (b.learnerName || '').split(' ')[0] || '';
            return surnameA.localeCompare(surnameB);
        });

        sortedAbsentees.forEach(data => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = data.admissionId || 'N/A';
            row.insertCell().textContent = data.learnerName || 'N/A';
            row.insertCell().textContent = data.fullGradeSection || 'N/A';
            // Display total count for term view, or day names for week view
            row.insertCell().textContent = (weekFilter === 'All') ? data.totalAbsences : data.absentDaysText;
        });

        let finalStatusText = `Found ${sortedAbsentees.length} learner(s) with absences for the selected period`;
        if (classFilter !== 'All') finalStatusText += ` for Class ${classFilter}`;
        statusMessage.textContent = finalStatusText + '.';
        if (sortedAbsentees.length === 0) {
            statusMessage.textContent = `All learners were present for the selected period` + (classFilter !== 'All' ? ` in Class ${classFilter}` : '') + '.';
        }

    } catch (error) {
        console.error("Error loading attendance records:", error);
        statusMessage.textContent = 'An error occurred while loading attendance records. Please check the console.';
        if (error.code === 'failed-precondition') {
            statusMessage.innerHTML += '<br><strong>Action Required:</strong> A database index is required for this query. Please contact your system administrator and ask them to create the composite index for the `attendance_records` collection as specified in the browser console error log.';
        }
    }
}

/**
 * Populates the attendance class filter dropdown with unique classes from the snapshot.
 * @param {firebase.firestore.QuerySnapshot} snapshot - The snapshot of attendance records for the week.
 */
function populateAttendanceClassFilter(snapshot) {
    const classFilterSelect = document.getElementById('attendance-class-filter');
    if (!classFilterSelect) return;

    const currentSelection = classFilterSelect.value;
    const uniqueClasses = new Set();
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.fullGradeSection) {
            uniqueClasses.add(data.fullGradeSection);
        }
    });

    classFilterSelect.innerHTML = '<option value="All">All Classes</option>'; // Reset
    Array.from(uniqueClasses).sort().forEach(className => {
        classFilterSelect.add(new Option(className, className));
    });
    classFilterSelect.value = currentSelection; // Restore previous selection if it still exists
}

/**
 * Updates the learner's document with the assigned section and the combined fullGradeSection.
 */
async function setLearnerSection(admissionId, grade, newSection) {
    const statusMessageElement = document.getElementById('assignment-status-message');
    statusMessageElement.textContent = 'Updating...';
    
    const finalSection = newSection.trim() === '' ? null : newSection; 
    const fullGradeSection = finalSection ? `${grade}${finalSection}` : null;
    const assignmentDisplay = fullGradeSection || `${grade} (Unassigned)`;

    if (!confirm(`Are you sure you want to assign this learner to class ${assignmentDisplay}?`)) {
        statusMessageElement.textContent = 'Assignment cancelled.';
        return;
    }

    try {
        const snapshot = await db.collection('sams_registrations')
            .where('admissionId', '==', admissionId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            statusMessageElement.textContent = "Error: Learner document not found in database.";
            return;
        }

        const docRef = snapshot.docs[0].ref;
        
        await docRef.update({
            section: finalSection,   
            fullGradeSection: fullGradeSection 
        });

        // Call global UI update function
        selectedLearnerData.section = finalSection;
        selectedLearnerData.fullGradeSection = fullGradeSection;
        // NOTE: Assumes displayLearnerAssignmentTool is defined in ui-handlers.js
        if (typeof displayLearnerAssignmentTool === 'function') {
            displayLearnerAssignmentTool(selectedLearnerData); 
        } else {
            document.getElementById('current-section-display').textContent = assignmentDisplay;
        }
        
        statusMessageElement.textContent = `Success! Learner updated to ${assignmentDisplay}.`;
        
        // Reset pagination state for list views so they reload when you click "Back"
        lastVisibleUnassigned = null;
        lastVisibleAssigned = null;
        lastVisibleAll = null;

    } catch (error) {
        console.error("Error updating learner section:", error);
        statusMessageElement.textContent = "An error occurred while assigning the section. Please try again.";
    }
}

/**
 * Fetches all unique class sections from all teacher profiles.
 * This is used to populate the class assignment dropdown.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique class names.
 */
async function fetchAllUniqueClassSections() {
    const uniqueSections = new Set();
    try {
        const snapshot = await db.collection('users').where('role', '==', 'teacher').get();

        if (snapshot.empty) {
            console.warn("No teachers found to populate class sections.");
            return [];
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.teachingAssignments && Array.isArray(data.teachingAssignments)) {
                data.teachingAssignments.forEach(assignment => {
                    if (assignment.fullClass) uniqueSections.add(assignment.fullClass);
                });
            }
        });

        return Array.from(uniqueSections).sort();
    } catch (error) {
        console.error("Error fetching unique class sections:", error);
        return []; // Return empty array on error
    }
}

async function addNewLearner() {
    const form = document.getElementById('add-learner-form');
    const statusMessage = document.getElementById('add-learner-status');
    
    const admissionId = document.getElementById('new-admission-id').value.trim();
    const name = document.getElementById('new-learner-name').value.trim();
    const surname = document.getElementById('new-learner-surname').value.trim();
    let grade = document.getElementById('new-grade').value.trim().toUpperCase(); 
    
    statusMessage.textContent = 'Processing...';

    if (!admissionId || !name || !surname || !grade) {
        statusMessage.textContent = 'Please fill in all required fields.';
        return;
    }

    if (grade !== 'R' && !isNaN(parseInt(grade, 10))) {
        grade = parseInt(grade, 10);
    } else if (grade !== 'R' && !['1', '2', '3', '4', '5', '6', '7'].includes(String(grade))) {
         statusMessage.textContent = 'Invalid Grade. Please use a number (1-7) or "R" for Reception.';
         return;
    }

    try {
        const existing = await db.collection('sams_registrations')
            .where('admissionId', '==', admissionId)
            .limit(1)
            .get();

        if (!existing.empty) {
            statusMessage.textContent = `Error: Learner with Admission ID ${admissionId} already exists.`;
            return;
        }

        const newLearnerData = {
            admissionId: admissionId,
            learnerName: name,
            learnerSurname: surname,
            grade: grade,
            section: null, 
            fullGradeSection: null, 
            importedAt: firebase.firestore.FieldValue.serverTimestamp(),
            learnerID: 'MANUAL_ENTRY', 
            parent1Email: 'N/A',
        };

        await db.collection('sams_registrations').add(newLearnerData);
        
        statusMessage.textContent = `Success! Learner ${name} ${surname} (ID: ${admissionId}) added.`;
        form.reset();
        
        lastVisibleAll = null;
        
        // Call global UI refresh function
        if (document.getElementById('all-learners-list-view').style.display === 'block') {
            const gradeFilter = document.getElementById('grade-filter');
            loadAllActiveLearners(gradeFilter ? gradeFilter.value : 'All', true);
        }

    } catch (error) {
        console.error("Error adding learner:", error);
        statusMessage.textContent = "An error occurred while adding the learner. Check console.";
    }
}


/**
 * Submits the announcement data to Firestore.
 */
async function publishAnnouncement() {
    const announcementForm = document.getElementById('new-announcement-form');
    const title = document.getElementById('announcement-title').value;
    const content = document.getElementById('announcement-content').value;
    const date = document.getElementById('announcement-date').value;
    const durationDays = parseInt(document.getElementById('announcement-duration').value, 10);

    if (!title || !content || !date || !durationDays) {
        alert("Please fill in all announcement fields.");
        return;
    }

    // Calculate the expiration date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0); // Normalize to start of the day
    const expiresAtDate = new Date(startDate);
    expiresAtDate.setDate(startDate.getDate() + durationDays);

    // Convert to Firestore Timestamp
    const expiresAtTimestamp = firebase.firestore.Timestamp.fromDate(expiresAtDate);

    try {
        await db.collection('announcements').add({
            title,
            content,
            date,
            durationDays,
            expiresAt: expiresAtTimestamp,
            createdAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
        alert('Announcement successfully published!');
        announcementForm.reset();
        // Set duration back to default
        document.getElementById('announcement-duration').value = 7;
    } catch (e) {
        console.error("Error adding document: ", e);
        alert('An error occurred while publishing the announcement. Please try again.');
    }
}

// =========================================================
// === LEARNER EDIT FORM DATA FUNCTIONS (NEW) ===
// =========================================================

/**
 * Reads form data and updates the learner's Firestore document.
 * @param {string} admissionId - The ID of the learner to update.
 */
async function updateLearnerDetails(admissionId) {
    const statusMessageElement = document.getElementById('edit-status-message');
    statusMessageElement.textContent = 'Saving changes...';
    statusMessageElement.style.display = 'block';
    statusMessageElement.classList.remove('error');

    const name = document.getElementById('edit-name').value.trim();
    const surname = document.getElementById('edit-surname').value.trim();
    let grade = document.getElementById('edit-grade').value.trim().toUpperCase(); 
    const dob = document.getElementById('edit-dob').value.trim();
    const parentName = document.getElementById('edit-parent-name').value.trim();
    const parentEmail = document.getElementById('edit-parent-email').value.trim();
    const parentContact = document.getElementById('edit-parent-contact').value.trim();
    
    if (!name || !surname || !grade) {
        statusMessageElement.textContent = 'Error: First Name, Last Name, and Grade are required.';
        statusMessageElement.classList.add('error');
        return;
    }
    
    // Grade validation
    if (grade !== 'R' && !['1', '2', '3', '4', '5', '6', '7'].includes(String(grade))) {
        statusMessageElement.textContent = 'Invalid Grade. Use "R" or a number 1-7.';
        statusMessageElement.classList.add('error');
        return;
    }
    grade = (grade === 'R') ? 'R' : parseInt(grade, 10); 

    try {
        const snapshot = await db.collection('sams_registrations')
            .where('admissionId', '==', admissionId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            statusMessageElement.textContent = "Error: Learner document not found.";
            statusMessageElement.classList.add('error');
            return;
        }

        const docRef = snapshot.docs[0].ref;
        
        const updateData = {
            learnerName: name,
            learnerSurname: surname,
            grade: grade, 
            parent1Name: parentName,
            parent1Email: parentEmail,
            parent1Contact: parentContact,
        };

        if (dob) {
            updateData.learnerDOB = dob;
        } else if (selectedLearnerData.learnerDOB) {
            // Explicitly remove DOB if the user cleared the field
             updateData.learnerDOB = firebase.firestore.FieldValue.delete();
        }
        
        // If the grade was changed, clear the section assignment (as it may be invalid)
        if (grade !== selectedLearnerData.grade) {
            updateData.section = null;
            updateData.fullGradeSection = null;
        }

        await docRef.update(updateData);

        // Update the global state
        selectedLearnerData = { 
            ...selectedLearnerData, 
            ...updateData,
            learnerDOB: dob // Update DOB in global state for immediate display
        };

        statusMessageElement.textContent = `Success! Learner profile for ${name} updated.`;
        statusMessageElement.classList.remove('error');

        // Optional: Immediately transition to the details view to show the result
        setTimeout(() => {
            window.location.hash = `#sams-learners`; 
            // NOTE: Assumes handleNavigation is defined in ui-handlers.js
            if (typeof handleNavigation === 'function') {
                handleNavigation(); 
            }
        }, 1500);

    } catch (error) {
        console.error("Error updating learner details:", error);
        statusMessageElement.textContent = "An error occurred during save. Check console.";
        statusMessageElement.classList.add('error');
    }
}

/**
 * **NEW**: Reads form data and updates the admin's Firestore document.
 * @param {string} adminUid - The UID of the admin to update.
 */
async function updateAdminProfile(adminUid) {
    const statusMessage = document.getElementById('admin-edit-profile-status');
    const form = document.getElementById('admin-edit-profile-form');
    const submitButton = form.querySelector('button[type="submit"]');

    const updatedData = {
        preferredName: document.getElementById('admin-edit-preferred-name').value.trim(),
        surname: document.getElementById('admin-edit-surname').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!updatedData.preferredName || !updatedData.surname) {
        alert('Please fill in all required fields.');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
    statusMessage.style.display = 'none';

    try {
        await db.collection('users').doc(adminUid).update(updatedData);

        // Update session storage to reflect changes immediately
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const newSessionUser = { ...currentUser, ...updatedData };
        sessionStorage.setItem('currentUser', JSON.stringify(newSessionUser));

        statusMessage.textContent = 'Profile updated successfully!';
        statusMessage.className = 'status-message-box success';
        statusMessage.style.display = 'block';

        // Refresh the profile display and hide the form
        loadAdminProfile(); // This will re-render the display with new data
        setTimeout(() => {
            document.querySelector('#profile .profile-card').style.display = 'flex';
            document.getElementById('admin-edit-profile-form-container').style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error("Error updating admin profile:", error);
        statusMessage.textContent = 'Failed to update profile. Please try again.';
        statusMessage.className = 'status-message-box error';
        statusMessage.style.display = 'block';
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
}

/**
 * **NEW**: Handles the upload of a new profile picture for the admin.
 * @param {Event} e - The file input change event.
 * @param {string} adminUid - The UID of the admin user.
 */
async function uploadAdminProfilePicture(e, adminUid) {
    const file = e.target.files[0];
    const statusIndicator = document.getElementById('admin-profile-pic-upload-status');
    const profilePic = document.getElementById('admin-profile-pic');

    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('File is too large. Please select an image smaller than 2MB.');
        return;
    }

    statusIndicator.style.display = 'flex';
    statusIndicator.innerHTML = '<i class="fas fa-sync fa-spin"></i>';

    try {
        const storage = firebase.storage(); // Get storage instance
        const storageRef = storage.ref();
        const filePath = `profile_pictures/${adminUid}/profile.jpg`;
        const fileRef = storageRef.child(filePath);

        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        await db.collection('users').doc(adminUid).update({
            photoUrl: downloadURL
        });

        // Update UI and session storage
        profilePic.src = downloadURL;
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        currentUser.photoUrl = downloadURL;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        statusIndicator.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            statusIndicator.style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error("Error uploading admin profile picture:", error);
        statusIndicator.innerHTML = '<i class="fas fa-times"></i>';
        alert('Failed to upload profile picture.');
        setTimeout(() => {
            statusIndicator.style.display = 'none';
        }, 3000);
    } finally {
        // Clear the file input value to allow re-uploading the same file
        e.target.value = '';
    }
}


// =========================================================
// === EMPLOYEE MANAGEMENT SYSTEM (EMS) FUNCTIONS (UPDATED) ===
// =========================================================

/**
 * Queries Firebase for all active users with the role 'teacher' for the EMS list view.
 */
async function loadAllTeachers(filterGrade = 'All', reset = false) {
    const tableBody = document.querySelector('#teachers-data-table tbody');
    const statusMessage = document.getElementById('teachers-data-status');
    let loadMoreBtn = document.getElementById('load-more-teachers-btn');

    if (reset) {
        tableBody.innerHTML = '';
        lastVisibleTeachers = null;
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
    
    statusMessage.textContent = `Fetching teacher profiles for ${filterGrade === 'All' ? 'All Grades' : 'Grade ' + filterGrade}...`;
    
    try {
        let query = db.collection('users')
                      .where('role', '==', 'teacher');

        if (filterGrade !== 'All') {
            query = query.where('assignedGrades', 'array-contains', filterGrade);
        }
        // query = query.orderBy('surname').orderBy('preferredName'); // This requires a composite index. Sorting will be done client-side.
        
        if (lastVisibleTeachers) {
            query = query.startAfter(lastVisibleTeachers);
        }

        // Fetch teachers, using PAGE_SIZE
        const snapshot = await query.limit(PAGE_SIZE).get(); 

        if (snapshot.empty && tableBody.rows.length === 0) {
            statusMessage.textContent = `No teacher profiles found for ${filterGrade === 'All' ? 'All Grades' : 'Grade ' + filterGrade}.`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }
        
        const existingEmails = new Set(Array.from(tableBody.querySelectorAll('tr')).map(row => row.getAttribute('data-email')));

        // Sort the documents client-side by surname, then preferredName
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const nameA = `${a.data().surname} ${a.data().preferredName}`;
            const nameB = `${b.data().surname} ${b.data().preferredName}`;
            return nameA.localeCompare(nameB);
        });

        sortedDocs.forEach(doc => {
            const data = { ...doc.data(), uid: doc.id }; 
            const email = data.email;

            if (existingEmails.has(email)) {
                 return;
            }
            
            const row = tableBody.insertRow();
            row.setAttribute('data-email', email);
            
            // Column 1: Name
            row.insertCell().textContent = `${data.preferredName || ''} ${data.surname || ''}`;
            // Column 2: Email
            row.insertCell().textContent = data.email;
            // Column 3: Assigned Grade
            const roleCell = row.insertCell();
            if (data.isClassTeacher) {
                const subjects = (data.assignedSubjects && data.assignedSubjects.length > 0) ? `Teaches: ${data.assignedSubjects.join(', ')}` : 'No subjects listed';
                roleCell.innerHTML = `<strong>Class Teacher: ${data.responsibleClass || 'N/A'}</strong><br><small>${subjects}</small>`;
            } else {
                const grades = (data.assignedGrades && data.assignedGrades.length > 0) 
                    ? `Grades: ${data.assignedGrades.join(', ')}` 
                    : 'No grades assigned';
                roleCell.innerHTML = `<strong>Subject Teacher</strong><br><small>${grades}</small>`;
            }


            // Column 4: Action Menu
            const actionCell = row.insertCell();
            
            // Use the kebab menu for actions (View, Edit/Assign)
            if (typeof createTeacherKebabMenu === 'function') {
                actionCell.appendChild(createTeacherKebabMenu(data)); 
            } else {
                const viewButton = document.createElement('button');
                viewButton.textContent = 'View Profile';
                viewButton.className = 'cta-button-small'; 
                viewButton.onclick = () => alert(`Viewing profile for ${data.preferredName} ${data.surname}`);
                actionCell.appendChild(viewButton);
            }
        });
        
        if (!snapshot.empty) {
            // Set the cursor for the next page
            lastVisibleTeachers = snapshot.docs[snapshot.docs.length - 1];
        }

        if (loadMoreBtn) {
            if (snapshot.docs.length < PAGE_SIZE) {
                loadMoreBtn.style.display = 'none'; 
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
        }
        
        const currentTotal = tableBody.rows.length;
        statusMessage.textContent = `Displaying ${currentTotal} teacher profile(s) for ${filterGrade === 'All' ? 'All Grades' : 'Grade ' + filterGrade}.`;

    } catch (error) {
        console.error("Error loading Teacher data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
        if (error.code === 'failed-precondition') {
            statusMessage.innerHTML += '<br><strong>Action Required:</strong> This query requires a composite index. Please check the browser console for a link to create it in Firebase.';
        }
    }
}

/**
 * Updates a teacher's profile details and assigned grade in Firestore.
 * This is called from the UI when saving the teacher edit form.
 *
 * @param {string} teacherUid - The unique ID (UID) of the teacher document.
 */
async function assignTeacherGrade(teacherUid) {
    // Note: Assumes global selectedTeacherData is available.
    const statusMessage = document.getElementById('edit-teacher-status-message');
    
    // Get values from the edit form (assuming fields from your previous prompt)
    const newAssignedName = document.getElementById('edit-teacher-name').value.trim();
    const newAssignedSurname = document.getElementById('edit-teacher-surname').value.trim();
    const newAssignedContact = document.getElementById('edit-teacher-contact').value.trim();
    const newAssignedQualifications = document.getElementById('edit-teacher-qualifications').value.trim();
    const newAssignedGradesString = document.getElementById('edit-teacher-grades').value.trim();
    const newAssignedClassesString = document.getElementById('edit-teacher-classes').value.trim();
    const newAssignedSubjectsString = document.getElementById('edit-teacher-subjects').value.trim();
    
    // Reset status message
    statusMessage.style.display = 'none';
    
    if (!teacherUid) {
        statusMessage.textContent = 'Error: Teacher UID is missing.';
        statusMessage.style.backgroundColor = '#fdd';
        statusMessage.style.display = 'block';
        return;
    }

    // Convert comma-separated string to a clean array of strings
    const newAssignedGrades = newAssignedGradesString.split(',').map(g => g.trim().toUpperCase()).filter(g => g);
    const newAssignedClasses = newAssignedClassesString.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
    const newAssignedSubjects = newAssignedSubjectsString.split(',').map(s => s.trim()).filter(s => s);

    try {
        const teacherRef = db.collection('users').doc(teacherUid);
        
        const updateData = {
            preferredName: newAssignedName,
            surname: newAssignedSurname,
            contactNumber: newAssignedContact,
            qualifications: newAssignedQualifications,
            assignedGrades: newAssignedGrades,
            assignedClasses: newAssignedClasses,
            assignedSubjects: newAssignedSubjects,
            assignedGrade: firebase.firestore.FieldValue.delete(), // Remove the old field
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await teacherRef.update(updateData);

        statusMessage.textContent = `Success! Teacher profile and Assigned Grades updated.`;
        statusMessage.style.backgroundColor = '#dfd';
        statusMessage.style.display = 'block';
        
        // Update the globally stored data to reflect the change immediately
        if (selectedTeacherData && selectedTeacherData.uid === teacherUid) {
            Object.assign(selectedTeacherData, updateData);
            // Directly re-render the details view with the new data
            // NOTE: Assumes displayTeacherDetails is defined in ui-handlers.js
            if (typeof displayTeacherDetails === 'function') {
                displayTeacherDetails();
            }
        }
        
        // Reset pagination for list refresh
        lastVisibleTeachers = null;

        // Delay navigation to allow user to see success message
        setTimeout(() => {
            // Navigate back to the details view to show the updated info
            window.location.hash = `#teacher-details`;
            // NOTE: Assumes handleNavigation is defined in ui-handlers.js
            if (typeof handleNavigation === 'function') {
                handleNavigation();
            }
        }, 1500);

    } catch (error) {
        console.error("Error updating teacher profile:", error);
        statusMessage.textContent = `Update failed: ${error.message}`;
        statusMessage.style.backgroundColor = '#fdd';
        statusMessage.display = 'block';
    }
}

/**
 * Prompts for confirmation and then permanently removes a teacher's profile from Firestore.
 * Note: This does not delete the user from Firebase Authentication, only their profile data.
 * @param {Object} data - The teacher data object, containing the UID.
 */
async function confirmAndRemoveTeacher(data) {
    const teacherName = `${data.preferredName || ''} ${data.surname || ''}`.trim();
    const teacherUid = data.uid;

    if (!confirm(`WARNING: Are you sure you want to PERMANENTLY remove the teacher profile for "${teacherName}"? This action cannot be undone.`)) {
        return;
    }

    if (!teacherUid) {
        alert('Error: Teacher UID not found. Cannot remove profile.');
        return;
    }

    try {
        const teacherRef = db.collection('users').doc(teacherUid);
        await teacherRef.delete();

        alert(`Success! Teacher profile for "${teacherName}" has been removed.`);

        lastVisibleTeachers = null; // Reset pagination
        loadAllTeachers(true); // Refresh the teacher list

    } catch (error) {
        console.error("Error removing teacher profile:", error);
        alert("An error occurred while removing the teacher. Please check the console for details.");
    }
}