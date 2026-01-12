// navigation-ui.js

// Assumes 'selectedLearnerData', 'loadSamsRegistrations', 'loadAllActiveLearners', 
// 'displayLearnerDetails', 'loadUnassignedLearners', 'loadAssignedLearners', 
// 'displayLearnerAssignmentTool', and 'showSamsDetails' are available.

// =========================================================
// === NAVIGATION & UI LOGIC ===
// =========================================================

function handleNavigation() {
    let targetId = window.location.hash.substring(1); 
    
    if (!targetId || !document.getElementById(targetId)) {
        targetId = 'profile'; 
    }

    // 1. Deactivate all sections and links
    document.querySelectorAll('.portal-section').forEach(section => {
        section.classList.remove('active-section');
    });
    document.querySelectorAll('.sidebar ul li a, .sidebar ul li ul li a').forEach(link => {
        link.classList.remove('active');
    });

    // 2. Activate the target section and link
    const targetSection = document.getElementById(targetId);
    const targetLink = document.querySelector(`.sidebar a[href="#${targetId}"]`);

    if (targetSection) {
        targetSection.classList.add('active-section');
    }
    if (targetLink) {
        targetLink.classList.add('active');
        const parentUL = targetLink.closest('ul.sub-menu');
        if (parentUL) {
            const groupTitleLink = parentUL.closest('li').querySelector('.group-title');
            if (groupTitleLink) {
                 groupTitleLink.classList.add('active');
            }
        }
    }

    // 3. Load data for specific sections
    if (targetId === 'sams-applications') { 
        // Calls a function from sams-data-loaders.js
        loadSamsRegistrations(); 
    } 
    
    // LOGIC FOR LEARNER MANAGEMENT SYSTEM (MAIN LIST)
    if (targetId === 'sams-learners') {
        document.getElementById('all-learners-list-view').style.display = selectedLearnerData ? 'none' : 'block';
        document.getElementById('learner-details-display').style.display = selectedLearnerData ? 'block' : 'none';
        document.getElementById('assignment-details-display').style.display = 'none'; 
        
        if (!selectedLearnerData) {
            const gradeFilter = document.getElementById('grade-filter');
            const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
            // Calls a function from lms-manager.js
            loadAllActiveLearners(selectedGrade);
        } else {
            // Calls a function from lms-manager.js
            displayLearnerDetails(selectedLearnerData);
        }
    }
    
    // LOGIC FOR GRADE ASSIGNMENT TOOL (UPDATED)
    if (targetId === 'grade-assignment') {
        document.getElementById('all-learners-list-view').style.display = 'none';

        const unassignedList = document.getElementById('unassigned-learners-list');
        const assignedList = document.getElementById('assigned-learners-list');
        const detailContainer = document.getElementById('assignment-details-display');
        const viewUnassignedBtn = document.getElementById('view-unassigned-btn');
        const viewAssignedBtn = document.getElementById('view-assigned-btn');


        if (selectedLearnerData) {
            // Show detail view
            unassignedList.style.display = 'none';
            assignedList.style.display = 'none';
            detailContainer.style.display = 'block';
            // Calls a function from grade-assignment-tool.js
            displayLearnerAssignmentTool(selectedLearnerData);
        } else {
            // Show the selected list view
            detailContainer.style.display = 'none';
            
            const isUnassignedActive = viewUnassignedBtn && viewUnassignedBtn.classList.contains('active-view');
            
            if (isUnassignedActive) {
                unassignedList.style.display = 'block';
                assignedList.style.display = 'none';
                const gradeFilter = document.getElementById('assignment-grade-filter');
                const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
                // Calls a function from grade-assignment-tool.js
                loadUnassignedLearners(selectedGrade);
            } else {
                assignedList.style.display = 'block';
                unassignedList.style.display = 'none';
                const assignedGradeFilter = document.getElementById('assigned-grade-filter');
                const selectedGrade = assignedGradeFilter ? assignedGradeFilter.value : 'All';
                // Calls a function from grade-assignment-tool.js
                loadAssignedLearners(selectedGrade);
            }
        }
    }

    // Check for the new sections
    if (targetId === 'sams-educators') {
        console.log("Loading Educator Management System...");
        // This function call is now defined in ems-manager.js
        if (typeof loadAllTeachers === 'function') {
            loadAllTeachers(); // Initial load of all teachers list
        }
    }

    // New case for the teacher details view
    if (targetId === 'teacher-details') {
        if (selectedTeacherData && typeof displayTeacherDetails === 'function') {
            // Render the details using the data stored by showTeacherDetails()
            displayTeacherDetails(); 
        } else {
            // If no data is selected, redirect to the list
            window.location.hash = '#sams-educators';
            handleNavigation();
        }
    }
}

window.addEventListener('hashchange', handleNavigation);


/**
 * Helper function used by both tables to store data and transition to the detail view
 * @param {Object} data The learner data object.
 * @param {string} targetId The target section hash ('sams-learners' or 'grade-assignment').
 */
function showSamsDetails(data, targetId) {
    selectedLearnerData = { ...data }; 
    window.location.hash = `#${targetId}`;
    handleNavigation(); 
}

/**
 * Helper function used by the teachers table to store data and transition to the detail view
 * @param {Object} data The teacher data object.
 * @param {string} targetId The target section hash ('teacher-details').
 */
function showTeacherDetails(data, targetId) {
    // selectedTeacherData is a global state variable defined in firebase-config.js
    selectedTeacherData = { ...data }; 
    window.location.hash = `#${targetId}`;
    handleNavigation(); // Trigger the navigation update
}