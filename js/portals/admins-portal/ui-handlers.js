// scripts/ui-handlers.js

// NOTE: This script relies on global variables and all data functions
// (e.g., db, auth, selectedLearnerData, selectedTeacherData, loadAllActiveLearners, loadAllTeachers, 
// updateLearnerDetails, assignTeacherGrade, handleNavigation) 
// being defined in firebase-config.js and data-functions.js.

// Assume global state variables are defined (e.g., selectedTeacherData = null; activeAssignmentView = 'unassigned';)

// **FIX**: Define activeAssignmentView locally to prevent ReferenceError
var activeAssignmentView = 'unassigned';
var selectedLearnerData = null;
var selectedTeacherData = null;
var lastVisibleAll = null;
var lastVisibleUnassigned = null;
var lastVisibleAssigned = null;
var lastVisibleTeachers = null;

// =========================================================
// === LEARNER KEBAB MENU GENERATION AND HANDLERS ===
// =========================================================

/**
 * Creates the HTML structure for the Learner Kebab Menu (⋮).
 * @param {Object} data The learner data.
 * @returns {HTMLElement} The container div for the menu.
 */
function createKebabMenu(data) {
    const menuContainer = document.createElement('div');
    menuContainer.className = 'kebab-menu-container';

    const button = document.createElement('button');
    button.className = 'kebab-menu-btn';
    button.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
    // Set explicit black color as requested
    button.style.color = '#000000'; 

    const dropdown = document.createElement('div');
    dropdown.className = 'kebab-menu-dropdown';
    
    // Option 1: View Details 
    const viewOption = document.createElement('a');
    viewOption.textContent = 'View Details';
    viewOption.href = '#';
    viewOption.addEventListener('click', (e) => {
        e.preventDefault();
        showSamsDetails(data, 'sams-learners'); // Navigate to the LMS detail view
        menuContainer.classList.remove('active');
    });

    // Option 2: Edit Learner Info 
    const editOption = document.createElement('a');
    editOption.textContent = 'Edit Learner Info';
    editOption.href = '#';
    editOption.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToEditForm(data); 
        menuContainer.classList.remove('active');
    });

    dropdown.appendChild(viewOption);
    dropdown.appendChild(editOption);
    
    button.addEventListener('click', (e) => handleKebabMenuClick(e, menuContainer, button));
    document.addEventListener('click', (e) => handleKebabMenuOutsideClick(e, menuContainer));
    menuContainer.appendChild(button);
    menuContainer.appendChild(dropdown);
    return menuContainer;
}

// =========================================================
// === TEACHER KEBAB MENU GENERATION AND HANDLERS ===
// =========================================================

/**
 * Creates the HTML structure for the Teacher Kebab Menu (⋮).
 * @param {Object} data The teacher data.
 * @returns {HTMLElement} The container div for the menu.
 */
function createTeacherKebabMenu(data) {
    const menuContainer = document.createElement('div');
    menuContainer.className = 'kebab-menu-container';

    const button = document.createElement('button');
    button.className = 'kebab-menu-btn';
    button.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
    button.style.color = '#000000'; 

    const dropdown = document.createElement('div');
    dropdown.className = 'kebab-menu-dropdown';
    
    // Option 1: View Profile 
    const viewOption = document.createElement('a');
    viewOption.textContent = 'View Details';
    viewOption.href = '#';
    viewOption.addEventListener('click', (e) => {
        e.preventDefault();
        showTeacherDetails(data); 
        menuContainer.classList.remove('active');
    });

    // Option 2: Edit Teacher Info
    const editOption = document.createElement('a');
    editOption.textContent = 'Edit Details';
    editOption.href = '#';
    editOption.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToEditTeacherForm(data); 
        menuContainer.classList.remove('active');
    });

    // Option 3: Assign Subject(s)
    const assignSubjectOption = document.createElement('a');
    assignSubjectOption.textContent = 'Assign Subject(s)';
    assignSubjectOption.href = '#';
    assignSubjectOption.addEventListener('click', (e) => {
        e.preventDefault();
        // This navigates to the edit form where subjects/grades can be assigned.
        navigateToEditTeacherForm(data);
        menuContainer.classList.remove('active');
    });

    // Option 4: Remove Teacher
    const removeOption = document.createElement('a');
    removeOption.textContent = 'Remove Teacher';
    removeOption.className = 'menu-option-red';
    removeOption.href = '#';
    removeOption.addEventListener('click', (e) => {
        e.preventDefault();
        menuContainer.classList.remove('active');
        confirmAndRemoveTeacher(data);
    });

    dropdown.appendChild(viewOption);
    dropdown.appendChild(editOption);
    dropdown.appendChild(assignSubjectOption);
    dropdown.appendChild(removeOption);

    // Use common handler for click events to ensure dynamic positioning
    button.addEventListener('click', (e) => handleKebabMenuClick(e, menuContainer, button));
    document.addEventListener('click', (e) => handleKebabMenuOutsideClick(e, menuContainer));
    menuContainer.appendChild(button);
    menuContainer.appendChild(dropdown);
    return menuContainer;
}

// =========================================================
// === COMMON KEBAB MENU LOGIC ===
// =========================================================

/**
 * Handles the click event for a kebab menu button, toggling its active state
 * and determining if it should open upwards or downwards.
 * @param {Event} e - The click event.
 * @param {HTMLElement} menuContainer - The .kebab-menu-container element.
 * @param {HTMLElement} button - The .kebab-menu-btn element.
 */
function handleKebabMenuClick(e, menuContainer, button) {
    e.stopPropagation();

    // Close other open menus and remove 'open-up' class
    document.querySelectorAll('.kebab-menu-container.active').forEach(openMenu => {
        if (openMenu !== menuContainer) {
            openMenu.classList.remove('active');
            openMenu.querySelector('.kebab-menu-dropdown').classList.remove('open-up');
        }
    });

    menuContainer.classList.toggle('active');

    if (menuContainer.classList.contains('active')) {
        // Menu is now open, determine if it should open upwards
        const dropdown = menuContainer.querySelector('.kebab-menu-dropdown');
        const buttonRect = button.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const dropdownHeight = dropdown.offsetHeight; // This should be accurate as display is 'block' via CSS

        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;

        // If not enough space below (with a small buffer), AND there's enough space above, open upwards
        const buffer = 20; // Pixels buffer
        if (spaceBelow < (dropdownHeight + buffer) && spaceAbove > (dropdownHeight + buffer)) {
            dropdown.classList.add('open-up');
        } else {
            dropdown.classList.remove('open-up'); // Ensure it opens downwards by default
        }
    } else {
        // Menu is closing, ensure open-up class is removed
        menuContainer.querySelector('.kebab-menu-dropdown').classList.remove('open-up');
    }
}

function handleKebabMenuOutsideClick(e, menuContainer) {
    if (!menuContainer.contains(e.target) && menuContainer.classList.contains('active')) {
        menuContainer.classList.remove('active');
        menuContainer.querySelector('.kebab-menu-dropdown').classList.remove('open-up');
    }
}

/**
 * Sets up the mobile sidebar toggle functionality.
 */
function setupMobileSidebar() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const contentWrapper = document.querySelector('.portal-content-wrapper');

    if (menuToggle && sidebar && contentWrapper) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the contentWrapper click from firing
            sidebar.classList.toggle('is-open');
            contentWrapper.classList.toggle('overlay-active');
        });

        // Close sidebar when clicking on the content overlay
        contentWrapper.addEventListener('click', () => {
            if (sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
                contentWrapper.classList.remove('overlay-active');
            }
        });
    }
}


// =========================================================
// === NAVIGATION & UI LOGIC ===
// =========================================================

/**
 * Helper function used by tables to store learner data and transition to the LMS detail view
 */
function showSamsDetails(data, targetId) {
    selectedLearnerData = { ...data }; 
    window.location.hash = `#${targetId}`;
    handleNavigation(); 
}

/**
 * Stores learner data globally and triggers navigation to the learner edit form.
 * @param {Object} data - The learner data object.
 */
function navigateToEditForm(data) {
    selectedLearnerData = { ...data }; // Store the data globally
    window.location.hash = `#edit-learner-profile`; // Navigate to the new section
    handleNavigation(); 
}

/**
 * Helper function used by teacher tables to store teacher data and show details
 */
function showTeacherDetails(data) {
    selectedTeacherData = { ...data }; 
    window.location.hash = `#teacher-details`; // Assuming a new section ID for details
    handleNavigation();
}

/**
 * Stores teacher data globally and triggers navigation to the teacher edit form.
 * @param {Object} data - The teacher data object.
 */
function navigateToEditTeacherForm(data) {
    selectedTeacherData = { ...data }; // Store the data globally
    window.location.hash = `#edit-teacher-profile`; // Assuming a new section ID for teacher edit
    handleNavigation();
}

/**
 * Handles all internal portal navigation by toggling section visibility and loading data.
 */
function handleNavigation() {
    let targetId = window.location.hash.substring(1); 
    
    // Define a default and check for a valid section ID
    if (!targetId || !document.getElementById(targetId)) {
        targetId = 'profile'; 
    }

    // --- FIX: Reset all specific view containers before activating the new section ---
    // This prevents content from different sections from overlapping.
    const allSpecificViews = [
        'learner-details-display', 'all-learners-list-view', 'add-learner-form-section',
        'remove-duplicates-section', 'remove-learner-section', 'assignment-details-display',
        'unassigned-learners-list', 'assigned-learners-list', 'teacher-details-display',
        'all-teachers-list', 'edit-teacher-profile', 'edit-learner-profile'
    ];

    allSpecificViews.forEach(viewId => {
        const view = document.getElementById(viewId);
        if (view) {
            view.style.display = 'none';
        }
    });
    // Reset pagination and state if leaving detail/assignment/management views
    if (!['grade-assignment', 'sams-learners', 'edit-learner-profile', 'sams-educators', 'edit-teacher-profile', 'teacher-details', 'grade-sections', 'sams-parents'].includes(targetId)) {
        lastVisibleUnassigned = null;
        lastVisibleAssigned = null;
        lastVisibleAll = null;
        lastVisibleTeachers = null; 
        selectedLearnerData = null;
        selectedTeacherData = null; 
    }
    
    // Deactivate all sections and links
    document.querySelectorAll('.portal-section').forEach(section => {
        section.classList.remove('active-section');
    });
    document.querySelectorAll('.sidebar ul li a, .sidebar ul li ul li a').forEach(link => {
        link.classList.remove('active');
    });

    // Activate the current section and link
    const targetSection = document.getElementById(targetId);
    const targetLink = document.querySelector(`.sidebar a[href="#${targetId}"]`);

    if (targetSection) {
        targetSection.classList.add('active-section');
    }
    if (targetLink) {
        targetLink.classList.add('active');
        // Activate parent group title if it's a sub-menu item
        const parentUL = targetLink.closest('ul.sub-menu');
        if (parentUL) {
            const groupTitleLink = parentUL.closest('li').querySelector('.group-title');
            if (groupTitleLink) {
                groupTitleLink.classList.add('active');
            }
        }
    }

    // --- Data Loading and View Toggling Logic ---
    
    if (targetId === 'sams-applications') { 
        selectedLearnerData = null;
        loadSamsRegistrations(); 
    } 
    
    if (targetId === 'sams-learners') {
        const listContainer = document.getElementById('all-learners-list-view');
        const detailsContainer = document.getElementById('learner-details-display');
        
        // Hide temporary forms
        const addFormSection = document.getElementById('add-learner-form-section');
        const removeSection = document.getElementById('remove-learner-section');
        const duplicatesSection = document.getElementById('remove-duplicates-section');
        if (addFormSection) addFormSection.style.display = 'none';
        // If the add form is being displayed, don't let navigation hide it.
        if (addFormSection && addFormSection.style.display === 'block') {
            listContainer.style.display = 'none';
            return;
        }
        if (removeSection) removeSection.style.display = 'none';
        if (duplicatesSection) duplicatesSection.style.display = 'none';

        if (!selectedLearnerData) {
            listContainer.style.display = 'block';
            detailsContainer.style.display = 'none';
            
            // Reload list if it was a detail view or if pagination reset
            if (lastVisibleAll === null || listContainer.style.display === 'block') { 
                const gradeFilter = document.getElementById('grade-filter');
                const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
                loadAllActiveLearners(selectedGrade, true); 
            }
        } else {
            listContainer.style.display = 'none';
            detailsContainer.style.display = 'block';
            displayLearnerDetails(selectedLearnerData); 
        }
        document.getElementById('assignment-details-display').style.display = 'none'; 
    }
    
    if (targetId === 'grade-assignment') {
        document.getElementById('all-learners-list-view').style.display = 'none';
        document.getElementById('learner-details-display').style.display = 'none';

        const detailContainer = document.getElementById('assignment-details-display');

        if (selectedLearnerData) {
            document.getElementById('unassigned-learners-list').style.display = 'none';
            document.getElementById('assigned-learners-list').style.display = 'none';
            detailContainer.style.display = 'block';
            displayLearnerAssignmentTool(selectedLearnerData);
        } else {
            detailContainer.style.display = 'none';
            loadAssignmentToolLists(activeAssignmentView); 
        }
    }

    if (targetId === 'edit-learner-profile') { 
        document.getElementById('all-learners-list-view').style.display = 'none';
        document.getElementById('learner-details-display').style.display = 'none';
        document.getElementById('assignment-details-display').style.display = 'none';
        
        showEditLearnerForm(); 
    }
    
    // EMS Teacher Management Handler
    if (targetId === 'sams-educators') {
        const listContainer = document.getElementById('all-teachers-list'); 
        const detailsContainer = document.getElementById('teacher-details-display'); 
        
        if (listContainer) listContainer.style.display = 'block';
        if (detailsContainer) detailsContainer.style.display = 'none';
        
        if (lastVisibleTeachers === null) {
            loadAllTeachers('All', true); 
        }
    }

    // Teacher Details View
    if (targetId === 'teacher-details') {
        const listContainer = document.getElementById('all-teachers-list'); 
        if (listContainer) listContainer.style.display = 'none';
        
        const detailsContainer = document.getElementById('teacher-details-display');
        if (detailsContainer) {
            detailsContainer.style.display = 'block';
            // This function renders the details using the globally stored selectedTeacherData
            displayTeacherDetails(selectedTeacherData); 
        }
    }
    
    // Teacher Edit View
    if (targetId === 'edit-teacher-profile') {
        const listContainer = document.getElementById('all-teachers-list'); 
        if (listContainer) listContainer.style.display = 'none';
        
        document.getElementById('teacher-details-display').style.display = 'none';
        showEditTeacherForm(); 
    }

    // Grade Sections View
    if (targetId === 'grade-sections') {
        // Initial state is handled by the event listeners, no initial data load needed.
    }

    // Parent Data View
    if (targetId === 'sams-parents') {
        // The initial load is now handled by the 'change' event listener logic
        // to prevent double-loading. We can trigger it manually if needed.
        const gradeFilter = document.getElementById('parent-grade-filter');
        const classFilter = document.getElementById('parent-class-filter');
        loadAllParentData(gradeFilter.value, classFilter.value);
    }

    // Announcements Management View
    if (targetId === 'announcements-mgmt') {
        loadAnnouncementsForManagement();
    }

    // **NEW**: Report Card Generator
    if (targetId === 'report-cards') {
        setupReportCardGenerator(db);
    }

    // School Calendar Management
    if (targetId === 'school-calendar') {
        setupOfficialCalendarManager(db);
    }
}


// =========================================================
// === LEARNER MANAGEMENT SYSTEM (LMS) DISPLAY FUNCTIONS ===
// =========================================================

function displayLearnerDetails(data) {
    const detailsContainer = document.getElementById('learner-details-display');
    const allLearnersList = document.getElementById('all-learners-list-view');
    
    allLearnersList.style.display = 'none';
    detailsContainer.style.display = 'block';

    if (!data) {
        detailsContainer.innerHTML = '<p>No learner data found. Please select a learner.</p>';
        return;
    }
    
    let dobDate = 'N/A';
    if (data.learnerDOB) {
        if (typeof data.learnerDOB.toDate === 'function') {
            dobDate = data.learnerDOB.toDate().toLocaleDateString();
        } else if (typeof data.learnerDOB === 'string') {
             try {
                dobDate = new Date(data.learnerDOB).toLocaleDateString();
            } catch (e) {
                dobDate = data.learnerDOB; 
            }
        }
    }
    
    const currentSection = data.section || ''; 
    const currentFullGrade = data.fullGradeSection || (currentSection ? `${data.grade}${currentSection}` : `${data.grade} (Unassigned)`);
    
    const contentHTML = `
        <button id="back-to-learner-list-main" class="cta-button-secondary" style="margin-bottom: 15px;">
            ← Back to All Active Learners List
        </button>
        <h3>Learner Profile: ${data.learnerName} ${data.learnerSurname} (LMS View)</h3>
        <p><strong>Admission No:</strong> ${data.admissionId}</p>
        <p><strong>Initial Grade:</strong> ${data.grade}</p>
        <p><strong>Current Class Assignment:</strong> <span style="font-weight: bold; color: ${!currentSection ? 'var(--primary-red)' : 'var(--primary-green)'};">${currentFullGrade}</span></p>
        <p><strong>ID Number:</strong> ${data.learnerID || 'N/A'}</p>
        <p><strong>Date of Birth:</strong> ${dobDate}</p>
        <hr>

        <h3>Parent/Guardian details: </h3>
        <p><strong>Parent Name:</strong> ${data.parent1Name || 'N/A'}</p>
        <p><strong>Parent Email:</strong> ${data.parent1Email || 'N/A'}</p>
        <p><strong>Parent Contact:</strong> ${data.parent1Contact || 'N/A'}</p>
        
        <button id="edit-details-btn" class="cta-button" style="margin-top: 20px;">
            <i class="fas fa-edit"></i> Edit Learner Details
        </button>
    `;

    detailsContainer.innerHTML = contentHTML;
    
    const backButton = document.getElementById('back-to-learner-list-main');
    if (backButton) {
        backButton.addEventListener('click', () => {
            selectedLearnerData = null; 
            window.location.hash = `#sams-learners`; 
            handleNavigation(); 
        });
    }

    const editButton = document.getElementById('edit-details-btn');
    if (editButton) {
        editButton.addEventListener('click', () => {
            navigateToEditForm(data); // Navigate to the edit form on button click
        });
    }
}

/**
 * Displays the learner edit form and populates it with the selected learner's data.
 */
function showEditLearnerForm() {
    const container = document.getElementById('edit-learner-profile');
    
    if (!selectedLearnerData) {
        container.innerHTML = '<p class="data-status-message error">Error: No learner selected for editing. Return to the list view.</p>';
        return;
    }

    const data = selectedLearnerData;
    
    let dobValue = '';
    if (data.learnerDOB) {
        if (typeof data.learnerDOB.toDate === 'function') {
            dobValue = data.learnerDOB.toDate().toISOString().split('T')[0];
        } else if (typeof data.learnerDOB === 'string' && data.learnerDOB.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dobValue = data.learnerDOB;
        }
    }
    
    const currentFullGrade = data.fullGradeSection || (data.section ? `${data.grade}${data.section}` : `${data.grade} (Unassigned)`);

    container.innerHTML = `
        <button id="back-to-learner-list-edit" class="cta-button-secondary" style="margin-bottom: 25px;">
            ← Back to All Active Learners List
        </button>

        <h2>Editing Profile: ${data.learnerName || ''} ${data.learnerSurname || ''}</h2>
        <p class="data-status-message">Admission ID: ${data.admissionId} | Current Class: ${currentFullGrade}</p>
        
        <form id="learner-edit-form">
            <div class="grid-container" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
                <div class="form-group">
                    <label for="edit-name">First Name</label>
                    <input type="text" id="edit-name" value="${data.learnerName || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-surname">Last Name</label>
                    <input type="text" id="edit-surname" value="${data.learnerSurname || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-grade">Grade (R/1-7)</label>
                    <input type="text" id="edit-grade" value="${data.grade || ''}" maxlength="1" required style="text-transform: uppercase;">
                </div>
                <div class="form-group">
                    <label for="edit-dob">Date of Birth</label>
                    <input type="date" id="edit-dob" value="${dobValue}">
                </div>
            </div>
            
            <h3 style="margin-top: 30px; margin-bottom: 15px;">Parent/Guardian Information</h3>
            <div class="grid-container" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
                <div class="form-group">
                    <label for="edit-parent-name">Parent Name</label>
                    <input type="text" id="edit-parent-name" value="${data.parent1Name || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-parent-email">Parent Email</label>
                    <input type="text" id="edit-parent-email" value="${data.parent1Email || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-parent-contact">Parent Contact No.</label>
                    <input type="text" id="edit-parent-contact" value="${data.parent1Contact || ''}">
                </div>
            </div>

            <p id="edit-status-message" class="status-message" style="display: none;"></p>
            <button type="submit" class="cta-button">
                <i class="fas fa-save"></i> Save Changes
            </button>
            <button type="button" id="cancel-edit-btn" class="cta-button-secondary" style="margin-left: 10px; margin-top: 15px;">
                Cancel
            </button>
        </form>
    `;
    
    // Attach event listeners after rendering the form
    document.getElementById('back-to-learner-list-edit').addEventListener('click', () => {
        selectedLearnerData = null; 
        window.location.hash = `#sams-learners`; 
        handleNavigation(); 
    });
    
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        // Go back to the learner's detail view
        window.location.hash = `#sams-learners`; 
        handleNavigation(); 
    });

    document.getElementById('learner-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        updateLearnerDetails(data.admissionId); 
    });
}

// =========================================================
// === EMS TEACHER DISPLAY FUNCTIONS ===
// =========================================================

/**
 * Displays the detailed profile view for a selected teacher.
 * This function should be in 'ui-handlers.js'.
 */
function displayTeacherDetails() {
    const container = document.getElementById('teacher-details-display');
    const listContainer = document.getElementById('all-teachers-list');

    if (!selectedTeacherData) {
        container.innerHTML = '<p>No teacher selected.</p>';
        return;
    }

    // Hide the list view and show the details view
    listContainer.style.display = 'none';
    container.style.display = 'block';

    const data = selectedTeacherData;
    let detailsHTML = `
        <button id="back-to-teachers-list" class="cta-button-secondary" style="margin-bottom: 20px;">
            ← Back to All Teachers
        </button>
        <h3>Profile for ${data.preferredName || ''} ${data.surname || ''}</h3>
        <div class="details-grid">
            <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
            <p><strong>Contact:</strong> ${data.contactNumber || 'N/A'}</p>
    `;

    if (data.isClassTeacher) {
        detailsHTML += `
            <p><strong>Primary Role:</strong> <span class="role-tag class-teacher">Class Teacher</span></p>
            <p><strong>Responsible Class:</strong> ${data.responsibleClass || 'Not specified'}</p>
        `;
    } else {
        detailsHTML += `<p><strong>Primary Role:</strong> <span class="role-tag subject-teacher">Subject Teacher</span></p>`;
    }

    // Display the detailed list of teaching assignments
    if (data.teachingAssignments && data.teachingAssignments.length > 0) {
        detailsHTML += `
            <h4 style="grid-column: 1 / -1; margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">Teaching Assignments</h4>
            <div style="grid-column: 1 / -1;">
                <ul style="list-style-type: disc; padding-left: 20px; margin: 0;">
                    ${data.teachingAssignments.map(a => `<li>${a.subject} for Class ${a.fullClass}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    detailsHTML += `</div>`; // Close details-grid
    container.innerHTML = detailsHTML;

    // Add event listener for the back button
    document.getElementById('back-to-teachers-list').addEventListener('click', () => {
        window.location.hash = '#sams-educators';
        handleNavigation(); // Assumes handleNavigation will show the list and hide the details
    });
}

/**
 * Displays the full teacher profile details.
 */
function displayTeacherDetails() { // Removed 'data' parameter
    const container = document.getElementById('teacher-details-display');

    if (!selectedTeacherData) { // Check global variable
        container.innerHTML = '<p>No teacher data found. Please select a teacher.</p>';
        return;
    }
    
    const data = selectedTeacherData; // Use the global data
    const contentHTML = `
        <button id="back-to-teacher-list" class="cta-button-secondary" style="margin-bottom: 15px;">
            ← Back to Teacher Profiles List
        </button>
        <h3>Teacher Profile: ${data.preferredName || data.name} ${data.surname}</h3>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Role:</strong> ${data.role}</p>
        <p><strong>Employee ID:</strong> ${data.employeeId || 'N/A'}</p>
        <p><strong>Contact No:</strong> ${data.contactNumber || 'N/A'}</p>
        <hr>

        <h3>Professional Information: </h3>
        <p><strong>Current Grade Assignment:</strong> <span id="display-assigned-grade" style="font-weight: bold; color: ${!(data.assignedGrades && data.assignedGrades.length > 0) ? 'var(--primary-red)' : 'var(--primary-green)'};">${(data.assignedGrades && data.assignedGrades.length > 0) ? data.assignedGrades.join(', ') : 'None'}</span></p>
        <p><strong>Qualifications:</strong> ${data.qualifications || 'N/A'}</p>
        
        <button id="edit-teacher-details-btn" class="cta-button" style="margin-top: 20px;">
            <i class="fas fa-edit"></i> Edit Teacher Profile
        </button>
    `;

    container.innerHTML = contentHTML;
    
    document.getElementById('back-to-teacher-list').addEventListener('click', () => {
        selectedTeacherData = null; 
        window.location.hash = `#sams-educators`; 
        handleNavigation(); 
    });

    document.getElementById('edit-teacher-details-btn').addEventListener('click', () => {
        navigateToEditTeacherForm(data); 
    });
}


/**
 * Displays the edit form and populates it with the selected teacher's data.
 */
function showEditTeacherForm() {
    const container = document.getElementById('edit-teacher-profile'); 
    
    if (!selectedTeacherData) {
        container.innerHTML = '<p class="data-status-message error">Error: No teacher selected for editing. Return to the list view.</p>';
        return;
    }

    const data = selectedTeacherData;
    
    container.innerHTML = `
        <button id="back-to-teacher-list-edit" class="cta-button-secondary" style="margin-bottom: 25px;">
            ← Back to Teacher Profiles List
        </button>

        <h2>Editing Teacher Profile: ${data.preferredName || data.name} ${data.surname}</h2>
        <p class="data-status-message">Employee ID: ${data.employeeId || 'N/A'}</p>
        
        <form id="teacher-edit-form">
            <div class="grid-container" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
                <div class="form-group">
                    <label for="edit-teacher-name">Preferred Name</label>
                    <input type="text" id="edit-teacher-name" value="${data.preferredName || data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-teacher-surname">Last Name</label>
                    <input type="text" id="edit-teacher-surname" value="${data.surname || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-teacher-email">Email (Cannot Change)</label>
                    <input type="email" id="edit-teacher-email" value="${data.email || ''}" disabled>
                </div>
                <div class="form-group">
                    <label for="edit-teacher-contact">Contact No.</label>
                    <input type="text" id="edit-teacher-contact" value="${data.contactNumber || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-teacher-grades">Assigned Grades (comma-separated)</label>
                    <input type="text" id="edit-teacher-grades" value="${(data.assignedGrades || []).join(', ')}">
                </div>
                <div class="form-group">
                    <label for="edit-teacher-classes">Assigned Classes (e.g., 6A, 7B)</label>
                    <input type="text" id="edit-teacher-classes" value="${(data.assignedClasses || []).join(', ')}">
                </div>
                <div class="form-group">
                    <label for="edit-teacher-subjects">Assigned Subjects (e.g., Maths, Science)</label>
                    <input type="text" id="edit-teacher-subjects" value="${(data.assignedSubjects || []).join(', ')}">
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="edit-teacher-qualifications">Qualifications/Notes</label>
                    <textarea id="edit-teacher-qualifications" rows="3">${data.qualifications || ''}</textarea>
                </div>
            </div>
            
            <p id="edit-teacher-status-message" class="status-message" style="display: none;"></p>
            <button type="submit" class="cta-button">
                <i class="fas fa-save"></i> Save Teacher Changes
            </button>
            <button type="button" id="cancel-teacher-edit-btn" class="cta-button-secondary" style="margin-left: 10px; margin-top: 15px;">
                Cancel
            </button>
        </form>
    `;
    
    // Attach event listeners after rendering the form
    document.getElementById('back-to-teacher-list-edit').addEventListener('click', () => {
        selectedTeacherData = null; 
        window.location.hash = `#sams-educators`; 
        handleNavigation(); 
    });
    
    document.getElementById('cancel-teacher-edit-btn').addEventListener('click', () => {
        // Go back to the teacher's detail view
        window.location.hash = `#teacher-details`; 
        handleNavigation(); 
    });

    document.getElementById('teacher-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        // *** CRITICAL UPDATE: Call the new function for grade assignment/profile update ***
        if (typeof assignTeacherGrade === 'function') {
            assignTeacherGrade(data.uid); 
        } else {
             document.getElementById('edit-teacher-status-message').textContent = 'Error: assignTeacherGrade function is missing (check data-functions.js).';
             document.getElementById('edit-teacher-status-message').style.display = 'block';
        }
    });
}

// =========================================================
// === GRADE ASSIGNMENT TOOL UI FUNCTIONS ===
// =========================================================

function loadAssignmentToolLists(newActiveList) {
    const unassignedList = document.getElementById('unassigned-learners-list');
    const assignedList = document.getElementById('assigned-learners-list');
    const viewUnassignedBtn = document.getElementById('view-unassigned-btn');
    const viewAssignedBtn = document.getElementById('view-assigned-btn');
    
    activeAssignmentView = newActiveList; 

    if (newActiveList === 'unassigned') {
        unassignedList.style.display = 'block';
        assignedList.style.display = 'none';
        
        viewUnassignedBtn.classList.add('active-view');
        viewAssignedBtn.classList.remove('active-view');

        const gradeFilter = document.getElementById('assignment-grade-filter');
        const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
        loadUnassignedLearners(selectedGrade, true); 
    } else {
        assignedList.style.display = 'block';
        unassignedList.style.display = 'none';
        
        viewAssignedBtn.classList.add('active-view');
        viewUnassignedBtn.classList.remove('active-view');

        const assignedGradeFilter = document.getElementById('assigned-grade-filter');
        const selectedAssignedGrade = assignedGradeFilter ? assignedGradeFilter.value : 'All';
        loadAssignedLearners(selectedAssignedGrade, true); 
    }
}


async function displayLearnerAssignmentTool(data) {
    const container = document.getElementById('assignment-details-display');
    const listContainer = document.getElementById('unassigned-learners-list');
    const assignedListContainer = document.getElementById('assigned-learners-list'); 
    
    listContainer.style.display = 'none';
    assignedListContainer.style.display = 'none'; 
    container.style.display = 'block';

    if (!data) {
        container.innerHTML = '<p>No learner data found. Please select a learner.</p>';
        return;
    }
    
    const currentSection = data.section || ''; 
    const currentFullGrade = data.fullGradeSection || (currentSection ? `${data.grade}${currentSection}` : `${data.grade} (Unassigned)`);

    // Fetch all unique class sections to populate the dropdown
    const allAvailableSections = await fetchAllUniqueClassSections();

    // **NEW**: Filter the sections to only show classes matching the learner's grade.
    const filteredSections = allAvailableSections.filter(section => {
        // A class like "6A" starts with the learner's grade "6".
        return section.startsWith(String(data.grade));
    });

    const sectionOptions = filteredSections.map(section => {
        // Check if this option is the currently assigned one for the learner
        const isSelected = (data.fullGradeSection === section) ? 'selected' : '';
        return `<option value="${section}" ${isSelected}>Class ${section}</option>`;
    }).join('');

    const contentHTML = `
        <button id="back-to-assignment-list" class="cta-button-secondary" style="margin-bottom: 15px;">
            ← Back to Class Assignment Lists
        </button>
        <h3>Assign Class for: ${data.learnerName} ${data.learnerSurname}</h3>
        <p><strong>Admission No:</strong> ${data.admissionId}</p>
        <p><strong>Registered Grade:</strong> ${data.grade}</p>
        <p><strong>Current Assignment:</strong> <span id="current-section-display" style="font-weight: bold; color: ${!currentSection ? 'var(--primary-red)' : 'var(--primary-green)'};">${currentFullGrade}</span></p>
        <hr>
        
        <h3>Class Section Assignment</h3>
        <p>Select a class from the list below. This list is automatically populated from all classes registered by teachers.</p>
        <div id="section-assignment-form" style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 20px;">
            <div class="form-group" style="margin-bottom: 0;">
                <label for="new-section-select">Assign to Section:</label>
                <select id="new-section-select">
                    <option value="">-- Select a Class --</option>
                    ${sectionOptions}
                </select>
            </div>
            <button id="assign-section-button" class="cta-button-small">
                <i class="fas fa-check"></i> Assign/Update
            </button>
        </div>
        <p id="assignment-status-message" style="margin-top: 10px; font-weight: bold;"></p>
    `;

    container.innerHTML = contentHTML;
    
    const backButton = document.getElementById('back-to-assignment-list');
    if (backButton) {
        backButton.addEventListener('click', () => {
            selectedLearnerData = null; 
            window.location.hash = `#grade-assignment`; 
            handleNavigation(); 
        });
    }

    const assignButton = document.getElementById('assign-section-button');
    if (assignButton) {
        assignButton.addEventListener('click', () => {
            const sectionSelect = document.getElementById('new-section-select');
            const selectedFullClass = sectionSelect.value;

            if (!selectedFullClass) {
                alert("Please select a class to assign.");
                return;
            }
            
            // Extract the grade and section from the selected value (e.g., "6A" -> grade "6", section "A")
            const newGrade = selectedFullClass.match(/^\d+|[R]/)[0];
            const newSection = selectedFullClass.replace(newGrade, '');

            setLearnerSection(data.admissionId, newGrade, newSection); 
        });
    }
}

/**
 * Renders the results of the duplicate scan into a table.
 * @param {Map<string, object[]>} duplicatesMap - The map of duplicates from findDuplicateLearners.
 */
function displayDuplicateLearners(duplicatesMap) {
    const container = document.getElementById('duplicates-results-container');
    container.innerHTML = '';

    if (duplicatesMap.size === 0) {
        return; // Nothing to display
    }

    let tableHTML = `
        <table id="duplicates-table" class="min-w-full divide-y divide-gray-200">
            <thead>
                <tr>
                    <th>Admission No.</th>
                    <th>Learner Name</th>
                    <th>Grade/Class</th>
                    <th>Firestore Doc ID</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const [admissionId, learners] of duplicatesMap.entries()) {
        tableHTML += `<tr class="duplicate-group-header"><td colspan="5">Duplicate(s) for Admission ID: <strong>${admissionId}</strong></td></tr>`;
        
        learners.forEach(learner => {
            const learnerName = `${learner.learnerName || ''} ${learner.learnerSurname || ''}`.trim();
            tableHTML += `
                <tr>
                    <td>${learner.admissionId}</td>
                    <td>${learnerName}</td>
                    <td>${learner.fullGradeSection || learner.grade}</td>
                    <td>${learner.docId}</td>
                    <td>
                        <button class="cta-button-small danger" onclick="removeLearnerByDocId('${learner.docId}', '${learnerName}')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;

    // Expose the removal function to the window so the inline onclick can find it
    window.removeLearnerByDocId = removeLearnerByDocId;
}


// =========================================================
// === PROFILE LOADING & INITIALIZATION (FINAL PART) ===
// =========================================================

function loadAdminProfile() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));

    // **NEW**: Add profile picture upload functionality
    const profileSection = document.getElementById('profile');
    const profileCard = profileSection.querySelector('.profile-card');
    const profilePicContainer = profileCard.querySelector('.profile-pic-container');

    // Inject the upload elements if they don't exist
    if (profilePicContainer && !profilePicContainer.querySelector('.profile-pic-upload-label')) {
        profilePicContainer.innerHTML += `
            <label for="admin-profile-pic-upload" class="profile-pic-upload-label" title="Upload new profile picture">
                <i class="fas fa-camera"></i>
            </label>
            <input type="file" id="admin-profile-pic-upload" accept="image/jpeg, image/png" style="display: none;">
            <div id="admin-profile-pic-upload-status" class="upload-status-indicator" style="display: none;"></div>
        `;
    }

    if (userData) {
        document.querySelector('#profile .profile-details p:nth-child(1)').innerHTML = `<strong>Name:</strong> ${userData.preferredName || 'Admin'} ${userData.surname || 'User'}`;
        document.querySelector('#profile .profile-details p:nth-child(2)').innerHTML = `<strong>Role:</strong> ${userData.role || 'Admin'}`; 
        document.querySelector('#profile .profile-details p:nth-child(3)').innerHTML = `<strong>Email:</strong> ${userData.email || 'N/A'}`;

        // **NEW**: Add edit profile functionality
        const profileSection = document.getElementById('profile');
        const profileCard = profileSection.querySelector('.profile-card'); // This is duplicated, but safe
        const adminProfilePic = document.getElementById('admin-profile-pic');
        if (adminProfilePic) adminProfilePic.src = userData.photoUrl || '../../images/placeholder-profile.png';
        
        // Ensure edit button and form don't already exist
        if (!profileCard.querySelector('#admin-edit-profile-btn')) {
            
            const editButton = document.createElement('a');
            editButton.href = '#';
            editButton.id = 'admin-edit-profile-btn';
            editButton.className = 'cta-button-edit';
            editButton.textContent = 'Edit Profile';
            profileCard.appendChild(editButton);

            const editFormHTML = `
                <div id="admin-edit-profile-form-container" class="tool-card" style="display: none; margin-top: 20px;">
                    <h3>Edit My Profile</h3>
                    <form id="admin-edit-profile-form">
                        <div class="grid-container" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
                            <div class="form-group">
                                <label for="admin-edit-preferred-name">Preferred Name</label>
                                <input type="text" id="admin-edit-preferred-name" value="${userData.preferredName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="admin-edit-surname">Surname</label>
                                <input type="text" id="admin-edit-surname" value="${userData.surname || ''}" required>
                            </div>
                        </div>
                        <p id="admin-edit-profile-status" class="status-message-box" style="display: none;"></p>
                        <button type="submit" class="cta-button"><i class="fas fa-save"></i> Save Changes</button>
                        <button type="button" id="admin-cancel-edit-btn" class="cta-button-secondary" style="margin-left: 10px;">Cancel</button>
                    </form>
                </div>
            `;
            profileSection.insertAdjacentHTML('beforeend', editFormHTML);

            const editFormContainer = document.getElementById('admin-edit-profile-form-container');
            const cancelBtn = document.getElementById('admin-cancel-edit-btn');
            const editForm = document.getElementById('admin-edit-profile-form');

            editButton.addEventListener('click', (e) => {
                e.preventDefault();
                profileCard.style.display = 'none';
                editFormContainer.style.display = 'block';
            });

            cancelBtn.addEventListener('click', () => {
                profileCard.style.display = 'flex';
                editFormContainer.style.display = 'none';
            });

            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                updateAdminProfile(userData.uid); // Assumes function exists in data-functions.js
            });

            // Add listener for the new profile pic upload
            const picUploadInput = document.getElementById('admin-profile-pic-upload');
            if (picUploadInput) {
                picUploadInput.addEventListener('change', (e) => {
                    uploadAdminProfilePicture(e, userData.uid);
                });
            }
        }
    } else {
        console.error("User data not found in session storage. Please log in again.");
    }
}

/**
 * Populates the attendance year filter with a range of years.
 */
function populateAttendanceYearFilter() {
    const yearFilter = document.getElementById('attendance-year-filter');
    if (!yearFilter) return;

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5; // Go back 5 years
    const endYear = currentYear + 1;   // Go forward 1 year

    yearFilter.innerHTML = ''; // Clear existing options

    for (let year = endYear; year >= startYear; year--) {
        const option = new Option(year, year);
        yearFilter.add(option);
    }

    // Set the current year as the default selection
    yearFilter.value = currentYear;
}

/**
 * Populates the attendance week filter based on the selected year and term.
 * @param {number} year - The selected year.
 * @param {number} term - The selected term (1-4).
 */
function populateAttendanceWeekFilter(year, term) {
    const weekFilter = document.getElementById('attendance-week-filter');
    if (!weekFilter) return;

    weekFilter.innerHTML = '<option value="All">All Weeks in Term</option>'; // Reset with default
    weekFilter.disabled = false;

    const termBoundaries = {
        1: { start: 1, end: 13 },
        2: { start: 14, end: 26 },
        3: { start: 27, end: 39 },
        4: { start: 40, end: 53 }
    };

    if (!term || !termBoundaries[term]) {
        weekFilter.disabled = true;
        return;
    }

    const { start, end } = termBoundaries[term];

    // Helper to get the month for a given week number in a year
    const getMonthForWeek = (yr, wk) => {
        const d = new Date(yr, 0, 1 + (wk - 1) * 7); // Approx date
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return monthNames[d.getMonth()];
    };

    for (let week = start; week <= end; week++) {
        const monthName = getMonthForWeek(year, week);
        const optionText = `Week ${week} (${monthName})`;
        weekFilter.add(new Option(optionText, week));
    }
}

/**
 * **NEW**: Exports the mark sheet data to an Excel file. (Copied from Teacher's Portal)
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
        const row = [learner.admissionId || 'N/A', `${learner.learnerName} ${learner.learnerSurname}`];
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

// =========================================================
// === MARK SHEET GENERATION (ADMIN) ===
// =========================================================

/**
 * Sets up the Mark Sheet generation tool for administrators.
 */
async function setupMarkSheetTool() {
    const classSelect = document.getElementById('admin-marksheet-class-select');
    const subjectSelect = document.getElementById('admin-marksheet-subject-select');
    const gradebookContainer = document.getElementById('admin-gradebook-container');

    if (!classSelect || !subjectSelect) return;

    // 1. Populate the class dropdown with all unique classes in the system
    try {
        const classesSnapshot = await db.collection('sams_registrations').get();
        const uniqueClasses = new Set();
        classesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.fullGradeSection) {
                uniqueClasses.add(data.fullGradeSection);
            }
        });

        classSelect.innerHTML = '<option value="">-- Select a Class --</option>';
        Array.from(uniqueClasses).sort().forEach(className => {
            classSelect.add(new Option(className, className));
        });

    } catch (error) {
        console.error("Error loading classes for mark sheets:", error);
        classSelect.innerHTML = '<option value="">Could not load classes</option>';
    }

    // 2. When a class is selected, populate the subject dropdown
    classSelect.addEventListener('change', async () => {
        const selectedClass = classSelect.value;
        subjectSelect.innerHTML = '<option value="">-- Loading Subjects... --</option>';
        subjectSelect.disabled = true;
        gradebookContainer.style.display = 'none';

        if (!selectedClass) {
            subjectSelect.innerHTML = '<option value="">-- Select Class First --</option>';
            return;
        }

        try {
            const assignmentsSnapshot = await db.collection('assignments').where('fullClass', '==', selectedClass).get();
            const uniqueSubjects = new Set();
            assignmentsSnapshot.forEach(doc => {
                uniqueSubjects.add(doc.data().subject);
            });

            subjectSelect.innerHTML = '<option value="">-- Select a Subject --</option>';
            if (uniqueSubjects.size === 0) {
                subjectSelect.innerHTML = '<option value="">No subjects with assignments</option>';
            } else {
                Array.from(uniqueSubjects).sort().forEach(subject => {
                    subjectSelect.add(new Option(subject, subject));
                });
                subjectSelect.disabled = false;
            }
        } catch (error) {
            console.error("Error loading subjects for mark sheets:", error);
            subjectSelect.innerHTML = '<option value="">Could not load subjects</option>';
        }
    });

    // 3. When a subject is selected, load the gradebook
    subjectSelect.addEventListener('change', () => {
        const selectedClass = classSelect.value;
        const selectedSubject = subjectSelect.value;

        if (selectedClass && selectedSubject) {
            gradebookContainer.style.display = 'block';
            loadGradebookForAdmin(selectedClass, selectedSubject);
        } else {
            gradebookContainer.style.display = 'none';
        }
    });
}

/**
 * Loads a read-only gradebook for the selected class and subject.
 * @param {string} fullClass - The full class name.
 * @param {string} subject - The subject name.
 */
async function loadGradebookForAdmin(fullClass, subject) {
    const generateBtn = document.getElementById('admin-generate-marksheet-btn');
    const container = document.getElementById('admin-gradebook-table-container');
    const status = document.getElementById('admin-gradebook-status');
    
    generateBtn.style.display = 'none';
    document.getElementById('admin-gradebook-header').textContent = `Gradebook for ${subject} - Class ${fullClass}`;
    status.textContent = 'Loading gradebook data...';
    container.innerHTML = '';

    try {
        // Fetch learners, assignments, and grades (logic adapted from teacher's portal)
        const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', fullClass).get();
        const learners = learnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.learnerName || '').localeCompare(b.learnerName || ''));

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
            status.textContent = 'No learners found in this class.';
            return;
        }

        // Build read-only table
        let tableHTML = '<table class="data-table"><thead><tr><th>Learner Name</th>';
        assignments.forEach(a => { tableHTML += `<th>${a.name} (${a.totalMarks})</th>`; });
        tableHTML += '</tr></thead><tbody>';

        learners.forEach(learner => {
            tableHTML += `<tr><td>${learner.learnerName} ${learner.learnerSurname}</td>`;
            assignments.forEach(assignment => {
                const grade = gradesMap.get(`${learner.id}-${assignment.id}`);
                tableHTML += `<td>${grade !== undefined ? grade : '--'}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
        status.textContent = `Displaying gradebook for ${learners.length} learners.`;

        // Show "Generate Mark Sheet" button if there's data
        if (learners.length > 0 && assignments.length > 0) {
            generateBtn.style.display = 'inline-block';
            // Re-use the generateMarkSheet function from teacher's portal (must be available)
            generateBtn.onclick = () => generateMarkSheet(fullClass, subject, learners, assignments, gradesMap);
        }

    } catch (error) {
        console.error('Error loading gradebook for admin:', error);
        status.textContent = 'An error occurred while loading the gradebook.';
    }
}

/**
 * Generates a printable mark sheet. (Copied from teachers-portal.js)
 * This function is now globally available via ui-handlers.js
 */
function generateMarkSheet(fullClass, subject, learners, assignments, gradesMap) {
    const modal = document.getElementById('marksheet-modal');
    const content = document.getElementById('marksheet-modal-content');
    const adminData = JSON.parse(sessionStorage.getItem('currentUser'));

    let totalPossibleMarks = 0;
    assignments.forEach(a => { totalPossibleMarks += a.totalMarks; });

    learners.sort((a, b) => (a.learnerName || '').localeCompare(b.learnerName || ''));

    let tableRows = learners.map(learner => {
        let learnerTotalScore = 0;
        const assignmentCells = assignments.map(assignment => {
            const score = gradesMap.get(`${learner.id}-${assignment.id}`);
            if (score !== undefined) learnerTotalScore += score;
            return `<td>${score !== undefined ? score : 'N/A'}</td>`;
        }).join('');

        const percentage = totalPossibleMarks > 0 ? ((learnerTotalScore / totalPossibleMarks) * 100).toFixed(1) : 0;
        const level = getAchievementLevel(percentage);

        return `<tr>
                    <td>${learner.admissionId || 'N/A'}</td>
                    <td>${learner.learnerName} ${learner.learnerSurname}</td>
                    ${assignmentCells}
                    <td>${learnerTotalScore}</td>
                    <td>${percentage}%</td>
                    <td>${level.level} (${level.description})</td>
                </tr>`;
    }).join('');

    // **FIX**: Complete the function by generating the full HTML for the modal.
    const marksheetHTML = `
        <div class="marksheet-header">
            <span class="modal-close-btn no-print">&times;</span>
            <img src="../../images/Logo.png" alt="School Logo" class="school-logo">
            <h1>Toronto Primary School</h1>
            <h2>Mark Sheet: ${subject} - Class ${fullClass}</h2>
            <p><strong>Generated By:</strong> Admin (${adminData.preferredName || ''} ${adminData.surname || ''})</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="data-table-container">
            <table class="data-table marksheet-table">
                <thead>
                    <tr>
                        <th>Adm No.</th>
                        <th>Learner Name</th>
                        ${assignments.map(a => `<th>${a.name}<br>(${a.totalMarks})</th>`).join('')}
                        <th>Total<br>(${totalPossibleMarks})</th>
                        <th>%</th>
                        <th>Level</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        <div class="marksheet-footer">
            <div class="signature-line">
                <p>Administrator's Signature:</p>
                <span>_________________________</span>
            </div>
            <div class="signature-line">
                <p>Date:</p>
                <span>_________________________</span>
            </div>
        </div>
        <div class="marksheet-actions no-print" style="margin-top: 20px; display: flex; gap: 10px;">
            <button onclick="window.print()" class="cta-button"><i class="fas fa-print"></i> Print Mark Sheet</button>
            <button id="admin-export-excel-btn" class="cta-button primary-green">
                <i class="fas fa-file-excel"></i> Export to Excel
            </button>
        </div>
    `;

    content.innerHTML = marksheetHTML;
    modal.style.display = 'block';

    // Add listeners to close the modal
    modal.querySelector('.modal-close-btn').onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // **NEW**: Add listener for the new Excel export button
    document.getElementById('admin-export-excel-btn').onclick = () => exportMarkSheetToExcel(fullClass, subject, learners, assignments, gradesMap);
}

/**
 * **NEW**: Calculates the achievement level based on a percentage score.
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


document.addEventListener('DOMContentLoaded', () => {
    loadAdminProfile();
    
    // **NEW**: Run the cleanup function for past announcements on page load.
    deletePastAnnouncements();

    // **NEW**: Set up the mark sheet tool
    setupMarkSheetTool();

    const initialHash = window.location.hash.substring(1);
    handleNavigation(); 
    window.addEventListener('hashchange', handleNavigation);

    // --- MOBILE SIDEBAR TOGGLE ---
    setupMobileSidebar();

    // --- LOG OUT LISTENER ---
    const logOutButton = document.querySelector('.btn-logout');
    if (logOutButton) {
        logOutButton.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => { 
                sessionStorage.removeItem('currentUser');
                window.location.href = '../../../html/auth/auth.html';
            }).catch(error => {
                alert("Logout failed: " + error.message);
            });
        });
    }

    // --- ANNOUNCEMENT FORM LISTENER ---
    const announcementForm = document.getElementById('new-announcement-form');
    if (announcementForm) {
        announcementForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            publishAnnouncement(); 
        });
    }

    // --- LMS Filter & Pagination Listener ---
    const gradeFilter = document.getElementById('grade-filter');
    const loadMoreAllBtn = document.getElementById('load-more-all-btn'); 
    
    if (gradeFilter) {
        gradeFilter.addEventListener('change', (e) => {
            selectedLearnerData = null; 
            loadAllActiveLearners(e.target.value, true); 
        });
    }
    if (loadMoreAllBtn) {
        loadMoreAllBtn.addEventListener('click', () => {
            const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
            loadAllActiveLearners(selectedGrade, false); 
        });
    }


    // --- MANUAL LEARNER MANAGEMENT LISTENERS ---
    const addFormSection = document.getElementById('add-learner-form-section');
    const removeSection = document.getElementById('remove-learner-section');
    const duplicatesSection = document.getElementById('remove-duplicates-section');
    const allLearnersList = document.getElementById('all-learners-list-view');

    const showAddFormBtn = document.getElementById('show-add-learner-form');
    if (showAddFormBtn) {
        showAddFormBtn.addEventListener('click', () => {
            // Hide the list and show the form.
            allLearnersList.style.display = 'none';
            addFormSection.style.display = 'block';
            duplicatesSection.style.display = 'none';
            // The "Back" button inside the form will handle returning to the list.
        });
    }

    const showRemoveSectionBtn = document.getElementById('show-remove-learner-section');
    if (showRemoveSectionBtn) {
        showRemoveSectionBtn.addEventListener('click', () => {
            if (removeSection.style.display === 'block') {
                removeSection.style.display = 'none';
                allLearnersList.style.display = 'block';
            } else {
                removeSection.style.display = 'block';
                addFormSection.style.display = 'none'; 
                duplicatesSection.style.display = 'none';
                allLearnersList.style.display = 'none'; 
            }
        });
    }

    const showDuplicatesToolBtn = document.getElementById('show-remove-duplicates-tool');
    if (showDuplicatesToolBtn) {
        showDuplicatesToolBtn.addEventListener('click', () => {
            allLearnersList.style.display = 'none';
            addFormSection.style.display = 'none';
            duplicatesSection.style.display = 'block';
        });
    }

    const scanBtn = document.getElementById('scan-for-duplicates-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            const duplicates = await findDuplicateLearners();
            displayDuplicateLearners(duplicates);
        });
    }

    const addLearnerForm = document.getElementById('add-learner-form');
    if (addLearnerForm) {
        addLearnerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addNewLearner(); 
        });
    }

    const executeRemoveBtn = document.getElementById('execute-remove-learner');
    if (executeRemoveBtn) {
        executeRemoveBtn.addEventListener('click', removeLearner); 
    }
    
    // --- ASSIGNMENT TOOL Filter & View Switcher Listeners ---
    const assignmentGradeFilter = document.getElementById('assignment-grade-filter');
    if (assignmentGradeFilter) {
        assignmentGradeFilter.addEventListener('change', (e) => {
            if (activeAssignmentView === 'unassigned') {
                loadUnassignedLearners(e.target.value, true); 
            }
        });
    }
    
    const assignedGradeFilter = document.getElementById('assigned-grade-filter');
    if (assignedGradeFilter) {
        assignedGradeFilter.addEventListener('change', (e) => {
            if (activeAssignmentView === 'assigned') {
                loadAssignedLearners(e.target.value, true); 
            }
        });
    }

    const viewUnassignedBtn = document.getElementById('view-unassigned-btn');
    const viewAssignedBtn = document.getElementById('view-assigned-btn');

    if (viewUnassignedBtn) {
        viewUnassignedBtn.addEventListener('click', () => {
            selectedLearnerData = null; 
            loadAssignmentToolLists('unassigned'); 
        });
    }

    if (viewAssignedBtn) {
        viewAssignedBtn.addEventListener('click', () => {
            selectedLearnerData = null; 
            loadAssignmentToolLists('assigned'); 
        });
    }
    
    const loadMoreUnassignedBtn = document.getElementById('load-more-unassigned-btn');
    if (loadMoreUnassignedBtn) {
        loadMoreUnassignedBtn.addEventListener('click', () => {
            const selectedGrade = assignmentGradeFilter ? assignmentGradeFilter.value : 'All';
            loadUnassignedLearners(selectedGrade, false); 
        });
    }
    
    const loadMoreAssignedBtn = document.getElementById('load-more-assigned-btn');
    if (loadMoreAssignedBtn) {
        loadMoreAssignedBtn.addEventListener('click', () => {
            const selectedGrade = assignedGradeFilter ? assignedGradeFilter.value : 'All';
            loadAssignedLearners(selectedGrade, false); 
        });
    }
    
    // EMS Teacher Management Listener
    const teacherGradeFilter = document.getElementById('teacher-grade-filter');
    const loadMoreTeachersBtn = document.getElementById('load-more-teachers-btn'); 
    
    if (teacherGradeFilter) {
        teacherGradeFilter.addEventListener('change', (e) => {
            if (typeof loadAllTeachers === 'function') {
                loadAllTeachers(e.target.value, true);
            }
        });
    }

    if (loadMoreTeachersBtn) {
        loadMoreTeachersBtn.addEventListener('click', () => {
            // Calls loadAllTeachers with resetPage = false to fetch the next batch
            if (typeof loadAllTeachers === 'function') {
                const selectedGrade = teacherGradeFilter ? teacherGradeFilter.value : 'All';
                loadAllTeachers(selectedGrade, false); 
            }
        });
    }

    // --- ATTENDANCE RECORDS LISTENERS ---
    const attendanceYearFilter = document.getElementById('attendance-year-filter');
    const attendanceTermFilter = document.getElementById('attendance-term-filter');
    const attendanceWeekFilter = document.getElementById('attendance-week-filter');
    const attendanceClassFilter = document.getElementById('attendance-class-filter');

    if (attendanceYearFilter && attendanceTermFilter && attendanceWeekFilter && attendanceClassFilter) {
        // Populate the year filter on page load
        populateAttendanceYearFilter();
        // Populate the week filter for the default selection
        populateAttendanceWeekFilter(attendanceYearFilter.value, attendanceTermFilter.value);

        const reloadAttendance = () => {
            loadAttendanceRecords(attendanceYearFilter.value, attendanceTermFilter.value, attendanceWeekFilter.value, attendanceClassFilter.value);
        };

        attendanceYearFilter.addEventListener('change', () => {
            populateAttendanceWeekFilter(attendanceYearFilter.value, attendanceTermFilter.value);
            reloadAttendance();
        });
        attendanceTermFilter.addEventListener('change', () => {
            populateAttendanceWeekFilter(attendanceYearFilter.value, attendanceTermFilter.value);
            reloadAttendance();
        });
        attendanceWeekFilter.addEventListener('change', reloadAttendance);
        attendanceClassFilter.addEventListener('change', reloadAttendance);
    }

    // --- EXPORT LISTENERS ---
    const exportLmsExcelBtn = document.getElementById('export-lms-excel-btn');
    if (exportLmsExcelBtn) {
        exportLmsExcelBtn.addEventListener('click', () => {
            const data = getTableData('active-learners-table');
            exportToExcel(data, 'Active_Learners_List');
        });
    }

    const exportLmsPdfBtn = document.getElementById('export-lms-pdf-btn');
    if (exportLmsPdfBtn) {
        exportLmsPdfBtn.addEventListener('click', () => {
            const data = getTableData('active-learners-table');
            exportToPdf(data, 'Active Learners List');
        });
    }

    const exportGradeSectionExcelBtn = document.getElementById('export-grade-section-excel-btn');
    if (exportGradeSectionExcelBtn) {
        exportGradeSectionExcelBtn.addEventListener('click', () => {
            const data = getTableData('grade-section-learners-table');
            const grade = document.getElementById('grade-section-grade-filter').value;
            const classSection = document.getElementById('grade-section-class-filter').value;
            const fileName = `Learners_Grade_${grade}_Class_${classSection}`;
            exportToExcel(data, fileName);
        });
    }

    const exportGradeSectionPdfBtn = document.getElementById('export-grade-section-pdf-btn');
    if (exportGradeSectionPdfBtn) {
        exportGradeSectionPdfBtn.addEventListener('click', () => {
            const data = getTableData('grade-section-learners-table');
            const grade = document.getElementById('grade-section-grade-filter').value;
            const classSection = document.getElementById('grade-section-class-filter').value;
            const title = `Learners for Grade ${grade}, Class ${classSection === 'All' ? 'All' : classSection}`;
            exportToPdf(data, title);
        });
    }

    // --- PARENT DATA LISTENERS ---
    const parentGradeFilter = document.getElementById('parent-grade-filter');
    const parentClassFilter = document.getElementById('parent-class-filter');

    if (parentGradeFilter) {
        parentGradeFilter.addEventListener('change', async (e) => {
            const selectedGrade = e.target.value;
            parentClassFilter.innerHTML = '<option value="All">All Classes</option>'; // Reset

            if (window.location.hash !== '#sams-parents') return;

            if (selectedGrade === 'All') {
                parentClassFilter.disabled = true;
                await loadAllParentData('All', 'All');
                return;
            }

            parentClassFilter.disabled = true; // Disable while loading

            // Load parent data for the whole grade first
            await loadAllParentData(selectedGrade, 'All');

            // Then, find unique sections to populate the class filter
            try {
                const gradeValue = (selectedGrade === 'R') ? 'R' : parseInt(selectedGrade, 10);
                const snapshot = await db.collection('sams_registrations').where('grade', '==', gradeValue).get();
                const sections = new Set();
                snapshot.forEach(doc => {
                    const section = doc.data().section;
                    if (section && section.trim() !== '') sections.add(section);
                });

                Array.from(sections).sort().forEach(section => {
                    parentClassFilter.add(new Option(section, section));
                });

                parentClassFilter.disabled = false; // Re-enable
            } catch (error) {
                console.error("Error populating parent class filter:", error);
            }
        });
    }

    if (parentClassFilter) {
        parentClassFilter.addEventListener('change', (e) => {
            if (window.location.hash === '#sams-parents') {
                loadAllParentData(parentGradeFilter.value, e.target.value);
            }
        });
    }

    // --- GRADE SECTIONS LISTENERS ---
    const gradeSectionGradeFilter = document.getElementById('grade-section-grade-filter');
    const gradeSectionClassFilter = document.getElementById('grade-section-class-filter');

    if (gradeSectionGradeFilter) {
        gradeSectionGradeFilter.addEventListener('change', async (e) => {
            const selectedGrade = e.target.value;
            gradeSectionClassFilter.innerHTML = '<option value="All">All Classes</option>'; // Reset

            if (!selectedGrade) {
                gradeSectionClassFilter.disabled = true;
                loadLearnersByGradeAndClass(null); // Clear the table
                return;
            }

            gradeSectionClassFilter.disabled = true; // Disable while loading classes

            // 1. Load all learners for the selected grade to show them immediately
            await loadLearnersByGradeAndClass(selectedGrade, 'All');

            // 2. Find unique sections for the class filter
            try {
                const gradeValue = (selectedGrade === 'R') ? 'R' : parseInt(selectedGrade, 10);
                const snapshot = await db.collection('sams_registrations').where('grade', '==', gradeValue).get();
                const sections = new Set();
                snapshot.forEach(doc => {
                    const section = doc.data().section;
                    if (section && section.trim() !== '') {
                        sections.add(section);
                    }
                });

                // Populate the class filter dropdown
                Array.from(sections).sort().forEach(section => {
                    const option = new Option(section, section);
                    gradeSectionClassFilter.add(option);
                });

                gradeSectionClassFilter.disabled = false; // Re-enable the filter
            } catch (error) {
                console.error("Error populating class filter:", error);
            }
        });
    }

    if (gradeSectionClassFilter) {
        gradeSectionClassFilter.addEventListener('change', (e) => {
            const selectedGrade = gradeSectionGradeFilter.value;
            const selectedClass = e.target.value;
            if (selectedGrade) {
                loadLearnersByGradeAndClass(selectedGrade, selectedClass);
            }
        });
    }
});