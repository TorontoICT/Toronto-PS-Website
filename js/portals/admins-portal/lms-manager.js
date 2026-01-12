// lms-manager.js

// Assumes 'db', 'selectedLearnerData', 'handleNavigation', and 'showSamsDetails' are available.

// =========================================================
// === LEARNER MANAGEMENT SYSTEM (LMS) DISPLAY FUNCTIONS ===
// =========================================================


/**
 * Displays the detailed information for the selected learner (Summary View).
 */
function displayLearnerDetails(data) {
    const detailsContainer = document.getElementById('learner-details-display');
    const allLearnersList = document.getElementById('all-learners-list-view');
    
    allLearnersList.style.display = 'none';
    detailsContainer.style.display = 'block';

    if (!data) {
        detailsContainer.innerHTML = '<p>No learner data found. Please select a learner.</p>';
        return;
    }
    
    const dobDate = data.learnerDOB ? new Date(data.learnerDOB).toLocaleDateString() : 'N/A';
    const currentSection = data.section || 'Unassigned';
    const currentFullGrade = data.fullGradeSection || `${data.grade} (${currentSection})`;
    
    const contentHTML = `
        <button id="back-to-learner-list-main" class="cta-button-secondary" style="margin-bottom: 15px;">
            ← Back to All Active Learners List
        </button>
        <h3>Learner Profile: ${data.learnerName} ${data.learnerSurname} (LMS View)</h3>
        <p><strong>Admission No:</strong> ${data.admissionId}</p>
        <p><strong>Initial Grade:</strong> ${data.grade}</p>
        <p><strong>Current Class Assignment:</strong> <span style="font-weight: bold; color: ${currentSection === 'Unassigned' ? 'var(--primary-red)' : 'var(--primary-green)'};">${currentFullGrade}</span></p>
        <p><strong>ID Number:</strong> ${data.learnerID || 'N/A'}</p>
        <p><strong>Date of Birth:</strong> ${dobDate}</p>
        <hr>

        <h3>Parent/Guardian details: </h3>
        <p><strong>Parent Name:</strong> ${data.parent1Name}</p>
        <p><strong>Parent Email:</strong> ${data.parent1Email}</p>
        <p><strong>Parent Contac:</strong> ${data.parent1Contact || 'N/A'}</p>
        
        <button class="cta-button" style="margin-top: 20px;">Open Full Learner Record (Coming Soon)</button>
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
}