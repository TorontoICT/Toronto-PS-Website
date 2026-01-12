// js/portals/teachers-portal/classes.js

/**
 * Fetches the teacher's assigned classes and then loads the learners for each class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data from session storage.
 */
async function loadTeacherClassesAndLearners(db, teacherAuthData) {
    if (!teacherAuthData || !teacherAuthData.uid) {
        console.error("Teacher authentication data is missing.");
        document.getElementById('class-rosters-container').innerHTML = '<p class="error-message">Could not identify teacher. Please log in again.</p>';
        return;
    }

    try {
        const teacherDocRef = db.collection('users').doc(teacherAuthData.uid);
        const teacherDoc = await teacherDocRef.get();

        if (!teacherDoc.exists) {
            document.getElementById('class-rosters-container').innerHTML = '<p class="error-message">Teacher profile not found.</p>';
            return;
        }

        const teacherData = teacherDoc.data();
        const teachingAssignments = teacherData.teachingAssignments || [];
        const assignedClasses = [...new Set(teachingAssignments.map(a => a.fullClass).filter(Boolean))].sort();

        const myClassesContainer = document.getElementById('classes');
        if (!myClassesContainer.querySelector('.teacher-assignments-card')) {
            displayTeacherAssignments(myClassesContainer, teacherData);
        }

        const rostersContainer = document.getElementById('class-rosters-container');
        rostersContainer.innerHTML = '';

        if (assignedClasses.length === 0) {
            rostersContainer.innerHTML = '<p class="info-message">You are not currently assigned to any classes.</p>';
            return;
        }

        populateClassFilter(assignedClasses);
        setupAttendanceRegister(db, teacherData);

        for (const className of assignedClasses) {
            const learnersQuery = db.collection('sams_registrations').where('fullGradeSection', '==', className);
            const learnersSnapshot = await learnersQuery.get();
            const learners = learnersSnapshot.docs.map(doc => doc.data());
            renderClassRoster(rostersContainer, className, learners);
        }

    } catch (error) {
        console.error("Error loading teacher classes and learners:", error);
        document.getElementById('class-rosters-container').innerHTML = '<p class="error-message">An error occurred while loading class data. Please try again.</p>';
    }
}

/**
 * Displays the teacher's role, responsible class, and all assigned grades/subjects.
 * @param {HTMLElement} container - The container element for the "My Classes" section.
 * @param {object} teacherData - The teacher's profile data from Firestore.
 */
function displayTeacherAssignments(container, teacherData) {
    if (!container || !teacherData) return;

    let assignmentsHTML = `
        <h2>My Assignments</h2>
        <div class="profile-card teacher-assignments-card" style="flex-direction: column; align-items: flex-start;">
    `;

    assignmentsHTML += `<p><strong>Role:</strong> ${teacherData.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}</p>`;
    if (teacherData.isClassTeacher && teacherData.responsibleClass) {
        assignmentsHTML += `<p><strong>Primary Responsible Class:</strong> ${teacherData.responsibleClass}</p>`;
    }

    if (teacherData.teachingAssignments && teacherData.teachingAssignments.length > 0) {
        assignmentsHTML += `
            <h4 style="margin-top: 15px; margin-bottom: 5px;">My Teaching Schedule:</h4>
            <ul style="list-style-type: disc; padding-left: 20px; margin: 0;">
                ${teacherData.teachingAssignments.map(a => `<li>${a.subject} for Class ${a.fullClass}</li>`).join('')}
            </ul>
        `;
    } else {
        assignmentsHTML += `<p><strong>Subjects Taught:</strong> Not specified</p>`;
    }

    assignmentsHTML += `</div><h2 style="margin-top: 30px;">Class Rosters</h2>`;
    container.innerHTML = assignmentsHTML + container.innerHTML;
}

/**
 * Populates the class filter dropdown and adds an event listener for filtering.
 * @param {Array<string>} assignedClasses - An array of class names assigned to the teacher.
 */
function populateClassFilter(assignedClasses) {
    const filterSelect = document.getElementById('teacher-class-filter');
    if (!filterSelect) return;

    filterSelect.innerHTML = '<option value="">Please select a class to show list of names</option><option value="all">Show All Classes</option>';
    assignedClasses.forEach(className => {
        filterSelect.add(new Option(`Class: ${className}`, className));
    });

    filterSelect.addEventListener('change', (e) => {
        const selectedClass = e.target.value;
        const rostersContainer = document.getElementById('class-rosters-container');
        const allRosterCards = rostersContainer.querySelectorAll('.tool-card');

        rostersContainer.style.display = selectedClass ? 'grid' : 'none';

        allRosterCards.forEach(card => {
            card.style.display = (selectedClass === 'all' || card.dataset.className === selectedClass) ? 'flex' : 'none';
        });
    });
}

/**
 * Renders the HTML for a single class roster and appends it to the container.
 * @param {HTMLElement} container - The main container for all class rosters.
 * @param {string} className - The name of the class (e.g., "1A").
 * @param {Array<object>} learners - An array of learner data objects.
 */
function renderClassRoster(container, className, learners) {
    const card = document.createElement('div');
    card.className = 'tool-card accent-1';
    card.dataset.className = className;

    sortLearnersByName(learners);

    let tableHTML = `
        <h3><i class="fas fa-chalkboard-teacher"></i> Class Roster: ${className}</h3>
        <p><strong>Total Learners:</strong> ${learners.length}</p>
    `;

    if (learners.length > 0) {
        tableHTML += `
            <div class="data-table-container" style="margin-top: 15px;">
                <table class="data-table">
                    <thead><tr><th>Admission No.</th><th>Learner Name</th></tr></thead>
                    <tbody>
                        ${learners.map(learner => `
                            <tr>
                                <td>${learner.admissionId || 'N/A'}</td>
                                <td>${formatLearnerName(learner)}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    }
    card.innerHTML = tableHTML;
    container.appendChild(card);
    card.style.display = 'none';

    const filterSelect = document.getElementById('teacher-class-filter');
    if (filterSelect.value) {
        filterSelect.dispatchEvent(new Event('change'));
    }
}