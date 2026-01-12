// main-initialization.js

// Assumes all utility functions (loadAdminProfile, handleNavigation, 
// loadAllActiveLearners, loadUnassignedLearners, loadAssignedLearners) 
// and the global state variable 'selectedLearnerData' are available.

// =========================================================
// === PROFILE LOADING & INITIALIZATION ===
// =========================================================

function loadAdminProfile() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));

    if (userData) {
        document.querySelector('#profile .profile-details p:nth-child(1)').innerHTML = `<strong>Name:</strong> ${userData.preferredName || 'Admin'} ${userData.surname || 'User'}`;
        document.querySelector('#profile .profile-details p:nth-child(2)').innerHTML = `<strong>Role:</strong> Admin`; 
        document.querySelector('#profile .profile-details p:nth-child(3)').innerHTML = `<strong>Email:</strong> ${userData.email || 'N/A'}`;
    } else {
        console.error("User data not found in session storage. Please log in again.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAdminProfile();
    handleNavigation(); 
    
    // Event listener for the main LMS list filter
    const gradeFilter = document.getElementById('grade-filter');
    if (gradeFilter) {
        gradeFilter.addEventListener('change', (e) => {
            selectedLearnerData = null; 
            loadAllActiveLearners(e.target.value);
        });
    }

    // Event listener for the Assignment Tool filter (Unassigned)
    const assignmentGradeFilter = document.getElementById('assignment-grade-filter');
    if (assignmentGradeFilter) {
        assignmentGradeFilter.addEventListener('change', (e) => {
            selectedLearnerData = null;
            loadUnassignedLearners(e.target.value);
        });
    }

    // --- Assignment View Switcher Listeners ---
    const viewUnassignedBtn = document.getElementById('view-unassigned-btn');
    const viewAssignedBtn = document.getElementById('view-assigned-btn');
    const assignedGradeFilter = document.getElementById('assigned-grade-filter');

    const switchView = (targetView) => {
        selectedLearnerData = null; 
        viewUnassignedBtn.classList.remove('active-view');
        viewAssignedBtn.classList.remove('active-view');
        
        if (targetView === 'unassigned') {
            viewUnassignedBtn.classList.add('active-view');
        } else {
            viewAssignedBtn.classList.add('active-view');
        }
        // Force navigation handler to load the correct list and state
        handleNavigation(); 
    };
    
    if (viewUnassignedBtn) {
        viewUnassignedBtn.addEventListener('click', () => switchView('unassigned'));
    }
    if (viewAssignedBtn) {
        viewAssignedBtn.addEventListener('click', () => switchView('assigned'));
    }
    
    // Event listener for the Assigned Learners list filter
    if (assignedGradeFilter) {
        assignedGradeFilter.addEventListener('change', (e) => {
            selectedLearnerData = null;
            loadAssignedLearners(e.target.value);
        });
    }

    // --- BULK ASSIGNMENT LISTENERS ---
    const unassignedTableBody = document.querySelector('#unassigned-learners-table tbody');
    const selectAllCheckbox = document.getElementById('select-all-unassigned');
    const bulkActionBar = document.getElementById('bulk-action-bar');
    const bulkActionCount = document.getElementById('bulk-action-count');
    const bulkAssignSelect = document.getElementById('bulk-assign-section-select');
    const bulkAssignButton = document.getElementById('bulk-assign-button');

    let selectedLearnerIds = new Set();

    function updateBulkActionBar() {
        const count = selectedLearnerIds.size;
        // Hide the bar by default and only show if items are selected.
        if (!bulkActionBar) return;

        if (count > 0) {
            bulkActionBar.style.display = 'flex';
            bulkActionCount.textContent = `${count} learner(s) selected`;
        } else {
            bulkActionBar.style.display = 'none';
            if (selectAllCheckbox) selectAllCheckbox.checked = false; // Uncheck "select all" if nothing is selected
        }
    }

    // Populate bulk assign dropdown based on selected grades
    async function populateBulkAssignDropdown() {
        const selectedCheckboxes = Array.from(unassignedTableBody.querySelectorAll('.learner-select-checkbox:checked'));
        const selectedGrades = [...new Set(selectedCheckboxes.map(cb => cb.dataset.grade))];

        bulkAssignSelect.innerHTML = '<option value="">-- Select a Class --</option>';

        if (selectedGrades.length === 1) {
            // Only populate if all selected learners are in the same grade
            const grade = selectedGrades[0];
            const allAvailableSections = await fetchAllUniqueClassSections();
            const filteredSections = allAvailableSections.filter(section => section.startsWith(String(grade)));
            
            filteredSections.forEach(section => {
                bulkAssignSelect.add(new Option(`Class ${section}`, section));
            });
            bulkAssignSelect.disabled = false;
        } else if (selectedGrades.length > 1) {
            bulkAssignSelect.innerHTML = '<option value="">Learners from multiple grades selected</option>';
            bulkAssignSelect.disabled = true;
        } else {
            bulkAssignSelect.disabled = true;
        }
    }

    if (unassignedTableBody) {
        unassignedTableBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('learner-select-checkbox')) {
                if (e.target.checked) {
                    selectedLearnerIds.add(e.target.value);
                } else {
                    selectedLearnerIds.delete(e.target.value);
                }
                updateBulkActionBar();
                populateBulkAssignDropdown();
            }
        });
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = unassignedTableBody.querySelectorAll('.learner-select-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                if (e.target.checked) {
                    selectedLearnerIds.add(checkbox.value);
                } else {
                    selectedLearnerIds.delete(checkbox.value);
                }
            });
            updateBulkActionBar();
            populateBulkAssignDropdown();
        });
    }

    if (bulkAssignButton) {
        bulkAssignButton.addEventListener('click', async () => {
            const selectedClass = bulkAssignSelect.value;
            await bulkSetLearnerSection(Array.from(selectedLearnerIds), selectedClass);
            // Refresh the list after assignment
            selectedLearnerIds.clear();
            selectAllCheckbox.checked = false;
            updateBulkActionBar();
            loadUnassignedLearners(assignmentGradeFilter.value, true);
        });
    }

    // --- ATTENDANCE RECORDS LISTENER ---
    const attendanceDateFilter = document.getElementById('attendance-date-filter');
    if (attendanceDateFilter) {
        // Set the default value to today's date
        attendanceDateFilter.value = new Date().toISOString().split('T')[0];
        
        attendanceDateFilter.addEventListener('change', (e) => {
            loadAttendanceRecords(e.target.value);
        });
    }
});

/**
 * Sets up the modal for viewing the profile picture.
 * @param {string} profilePicId - The ID of the profile picture img element.
 */
function setupImageViewer(profilePicId) {
    const modal = document.getElementById('image-viewer-modal');
    const profilePic = document.getElementById(profilePicId);
    const modalImg = document.getElementById('modal-image-content');
    const closeBtn = document.querySelector('.image-viewer-close');

    if (!modal || !profilePic || !modalImg || !closeBtn) return;

    profilePic.style.cursor = 'pointer';
    profilePic.onclick = function() {
        modal.style.display = "block";
        modalImg.src = this.src;
    }

    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    modal.onclick = function(event) {
        if (event.target === modal) { // Close if clicking on the background
            modal.style.display = "none";
        }
    }
}

// Inside your main portal initialization function...
async function initializeTeacherPortal(db, userData) {
    // ... your existing code to load profile, etc. ...

    // --- Setup Image Viewer ---
    setupImageViewer('teacher-profile-pic'); // Use the teacher's profile pic ID
}
