
// js/portals/teachers-portal/teachers-portal.js
import { setupAssessmentProgramme } from './assessment-programme.js';
import { setupCalendarSection } from './calendar.js';
import { setupLearnerProfileSection } from './learner-profiles.js';
import { setupPortfolioManager } from './portfolio.js';

/**
 * Sets up the responsive sidebar toggle for mobile view.
 */
function setupResponsiveSidebar() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const contentWrapper = document.querySelector('.portal-content-wrapper');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the click from closing the menu immediately
            sidebar.classList.toggle('is-open');
            if (contentWrapper) {
                contentWrapper.classList.toggle('overlay-active');
            }
        });
    }

    // Add a listener to the main content area to close the sidebar when clicking outside
    if (contentWrapper) {
        contentWrapper.addEventListener('click', () => {
            if (sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
                contentWrapper.classList.remove('overlay-active');
            }
        });
    }
}

// --- CORE DATA HANDLING & DISPLAY FUNCTIONS ---
document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    let db; // Declare db at a higher scope
    
    // If no user data, stop execution. The auth.js script will handle the redirect.
    if (userData) {
        // Initialize Firebase only if the user is potentially logged in
        // This check prevents errors if firebase is already initialized by another script.
        if (!firebase.apps.length) {
            // Fallback: only initialize if a firebaseConfig object exists.
            if (typeof firebaseConfig !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
            } else {
                console.warn('Firebase not initialized. Ensure js/shared/firebase-config.js is included before portal scripts.');
            }
        } else {
            // If already initialized, get the default app
            firebase.app();
        }
        db = firebase.firestore(); // Initialize the db variable

        loadTeacherProfile(userData);
        showClassTeacherSections(db, userData);
        // Load dynamic dashboard data
        loadTeacherDashboard(db, userData);
        // Set up the profile editing functionality
        setupProfileEditing(db, userData);
        // Set up profile picture upload functionality
        setupProfilePictureUpload(db, userData);
        loadTeacherDashboard(db, userData);
        // **NEW**: Initialize material management features
        setupMaterialUpload(db, userData);
        loadCourseMaterials(db);
        
        // **NEW**: Initialize the new grading system
        setupGradingSystem(db, userData);
        // Initialize the Roster Management tool
        setupRosterManagement(db);
        // **NEW**: Initialize the AI Content Generator
        setupAiContentGenerator(db, userData);
        // **NEW**: Initialize the Chat Engine
        setupChatEngine(db, userData);
        // **NEW**: Initialize Bulk Remove Tool
        setupBulkRemoveTool(db, userData);

        // Make delete function globally accessible for onclick handlers
        window.deleteAiHistoryItem = deleteAiHistoryItem;

        loadTeacherClassesAndLearners(db, userData); // This populates class rosters
    } else {
        console.error("User data not found in session storage. Please log in again.");
        return; // Stop further script execution
    }

    // Initialize the responsive sidebar functionality
    setupResponsiveSidebar();

    // Initialize the portfolio manager
    setupPortfolioManager(db, userData);

    // Expose assignment deletion function to the global scope for onclick handlers
    window.confirmDeleteAssignment = confirmDeleteAssignment;

    // Sidebar navigation logic
    // Select all links intended for section navigation, both in the sidebar and main content
    const navLinks = document.querySelectorAll('.sidebar a[href^="#"], .portal-content-wrapper a[href^="#"]');
    const sections = document.querySelectorAll('.portal-section');
    const sidebarLinks = document.querySelectorAll('.sidebar a[href^="#"]');


  // Function to show the target section and hide others
    function showSection(targetId) {
        // Define parent-child relationships for nested navigation
        const sectionMap = { // **FIX**: Removed 'grades-form' from this map.
            'attendance-form': 'students',
            'class-setup': 'students'
        };
        const parentId = sectionMap[targetId] || targetId;

        // Hide all main sections first
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });

        // Show the correct main parent section
        const parentSection = document.getElementById(parentId);
        if (parentSection) {
            parentSection.classList.add('active-section');
            parentSection.classList.remove('hidden-section');

            // If the parent is the 'students' section, manage its internal views
            if (parentId === 'students') {
                const subViews = parentSection.querySelectorAll('.learner-mgmt-view');
                subViews.forEach(view => view.style.display = 'none');

                const targetView = document.getElementById(targetId);
                if (targetView && targetView.classList.contains('learner-mgmt-view')) {
                    targetView.style.display = 'block'; // Show the specific tool
                } else {
                    // If #students is clicked directly, show its dashboard
                    const dashboard = parentSection.querySelector('#learner-mgmt-dashboard');
                    if (dashboard) dashboard.style.display = 'block';
                }
            }
        }
    }
  // Handle link clicks
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const targetId = this.getAttribute('href').substring(1);

      // Define which sections are part of the learner management module
      const learnerMgmtSections = ['students', 'attendance-form', 'class-setup'];

      // Remove active class from all sidebar links
      sidebarLinks.forEach(l => l.classList.remove('active'));
      
      // Determine which main sidebar link to activate
      let sidebarLinkTarget = learnerMgmtSections.includes(targetId) ? 'students' : targetId;
      const correspondingSidebarLink = document.querySelector(`.sidebar a[href="#${sidebarLinkTarget}"]`);

      if (correspondingSidebarLink) {
        correspondingSidebarLink.classList.add('active');
      }
      
      showSection(targetId);
      
      // **FIX**: If "My Classes" is clicked, explicitly reload the data.
      if (targetId === 'classes') {
        // loadTeacherClassesAndLearners is only called when classes is initially loaded
        // prevent potential duplicate data from showing
         const currentUserData = JSON.parse(sessionStorage.getItem('currentUser'));
        if (currentUserData) loadTeacherClassesAndLearners(db, currentUserData);
      }

      // Load portfolio items when the section is viewed
      if (targetId === 'portfolio') {
        showPortfolioListView();
      }

      // **NEW**: Load class filter for learner profiles when the section is viewed
      if (targetId === 'learner-profiles') {
        setupLearnerProfileSection(db, userData); // Pass userData here
      }

        // **NEW**: Initialize the School Calendar section
        if (targetId === 'calendar') {
            setupCalendarSection(db, userData);
        }

        // **NEW**: Initialize the Assessment Programme section
        if (targetId === 'assessment-programme-mgmt') {
            setupAssessmentProgramme(db, userData);
        }

      // Update URL hash
      // history.pushState(null, null, `#${targetId}`);
      history.pushState(null, null, `#${targetId}`);
    });
  });

    // Initialize listeners for the parent contacts filter and modal
    setupParentContactListeners();
    setupContactModalListeners();

    // --- ATTENDANCE FORM LISTENER ---
    const attendanceForm = document.getElementById('attendance-form');
    if (attendanceForm) setupAttendanceFormListener(attendanceForm, db);

  // Handle page load based on URL hash (default to dashboard)
  const initialHash = window.location.hash.substring(1) || 'dashboard';
  showSection(initialHash); // This will now handle the new section
  // Activate the correct sidebar link on page load
  const learnerMgmtSectionsOnLoad = ['students', 'attendance-form', 'class-setup', 'grades-form'];
  let initialSidebarTarget = learnerMgmtSectionsOnLoad.includes(initialHash) ? 'students' : initialHash;
  const initialLink = document.querySelector(`.sidebar a[href="#${initialSidebarTarget}"]`);
  if (initialLink) {
    initialLink.classList.add('active');
  }

  // **FIX**: Initialize sections that are loaded directly via URL hash
  if (initialHash === 'assessment-programme-mgmt') {
      setupAssessmentProgramme(db, userData);
  }
  if (initialHash === 'calendar') {
      setupCalendarSection(db, userData);
  }
  if (initialHash === 'learner-profiles') {
      setupLearnerProfileSection(db, userData); // Pass userData here as well
  }
});

/**
 * Sets up the Bulk Remove Tool for class teachers.
 */
function setupBulkRemoveTool(db, userData) {
    const openBtn = document.getElementById('open-bulk-remove-modal-btn');
    const modal = document.getElementById('bulk-remove-modal');
    const closeBtn = document.getElementById('close-bulk-remove-modal');
    const listContainer = document.getElementById('bulk-remove-list-container');
    const executeBtn = document.getElementById('execute-bulk-remove-btn');
    const selectAllCb = document.getElementById('select-all-bulk-remove');
    const searchInput = document.getElementById('bulk-remove-search');
    const countSpan = document.getElementById('bulk-remove-count');
    const classNameSpan = document.getElementById('bulk-remove-class-name');

    if (!openBtn || !modal) return;

    let currentLearners = [];
    let selectedIds = new Set();

    openBtn.addEventListener('click', async () => {
        modal.style.display = 'flex';
        
        // Fetch latest teacher data to get the current responsible class
        const userDoc = await db.collection('users').doc(userData.uid).get();
        const teacher = userDoc.data();
        const responsibleClass = teacher.responsibleClass;

        if (!responsibleClass) {
            listContainer.innerHTML = '<p class="error-message">You do not have a responsible class assigned.</p>';
            return;
        }

        classNameSpan.textContent = responsibleClass;
        loadLearners(responsibleClass);
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        selectedIds.clear();
        if (selectAllCb) selectAllCb.checked = false;
        updateUI();
    });

    async function loadLearners(className) {
        listContainer.innerHTML = '<p class="info-message">Loading learners...</p>';
        try {
            const snapshot = await db.collection('sams_registrations')
                .where('fullGradeSection', '==', className)
                .get();
            
            currentLearners = [];
            snapshot.forEach(doc => {
                currentLearners.push({ id: doc.id, ...doc.data() });
            });

            renderList();
        } catch (error) {
            console.error("Error loading learners:", error);
            listContainer.innerHTML = '<p class="error-message">Error loading learners.</p>';
        }
    }

    function renderList() {
        const filter = searchInput.value.toLowerCase();
        const filtered = currentLearners.filter(l => 
            (l.learnerName + ' ' + l.learnerSurname).toLowerCase().includes(filter)
        );

        if (filtered.length === 0) {
            listContainer.innerHTML = '<p class="info-message">No learners found.</p>';
            return;
        }

        listContainer.innerHTML = '';
        filtered.sort((a, b) => (a.learnerSurname || '').localeCompare(b.learnerSurname || '')).forEach(l => {
            const div = document.createElement('div');
            div.style.padding = '5px 0';
            div.style.borderBottom = '1px solid #f0f0f0';
            const isChecked = selectedIds.has(l.id) ? 'checked' : '';
            div.innerHTML = `
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" class="bulk-remove-cb" value="${l.id}" ${isChecked} style="margin-right: 10px;">
                    <span>${l.learnerSurname}, ${l.learnerName} (${l.admissionId})</span>
                </label>
            `;
            listContainer.appendChild(div);
        });

        listContainer.querySelectorAll('.bulk-remove-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) selectedIds.add(e.target.value);
                else selectedIds.delete(e.target.value);
                updateUI();
            });
        });
        updateUI();
    }

    searchInput.addEventListener('input', renderList);

    selectAllCb.addEventListener('change', (e) => {
        const checkboxes = listContainer.querySelectorAll('.bulk-remove-cb');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            if (e.target.checked) selectedIds.add(cb.value);
            else selectedIds.delete(cb.value);
        });
        updateUI();
    });

    function updateUI() {
        countSpan.textContent = selectedIds.size;
        executeBtn.disabled = selectedIds.size === 0;
    }

    executeBtn.addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to remove ${selectedIds.size} learners from your class?`)) return;

        executeBtn.disabled = true;
        executeBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Removing...';

        const batch = db.batch();
        selectedIds.forEach(docId => {
            const ref = db.collection('sams_registrations').doc(docId);
            // Unassign the learner by setting section and fullGradeSection to null
            batch.update(ref, {
                section: null,
                fullGradeSection: null
            });
        });

        try {
            await batch.commit();
            alert('Learners removed successfully.');
            modal.style.display = 'none';
            selectedIds.clear();
            
            // Trigger a refresh of the main roster list if the dropdown exists
            const rosterSelect = document.getElementById('roster-setup-class-select');
            if (rosterSelect) {
                rosterSelect.dispatchEvent(new Event('change'));
            }
        } catch (error) {
            console.error("Error removing learners:", error);
            alert("Failed to remove learners.");
        } finally {
            executeBtn.disabled = false;
            executeBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Remove Selected';
        }
    });
}
