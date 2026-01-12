// grade-assignment-tool.js

// Assumes 'db', 'selectedLearnerData', 'handleNavigation', and 'showSamsDetails' are available.

/**
 * Fetches all unique, non-empty sections for a given grade from the database.
 * @param {string|number} grade The grade to search for (e.g., 'R', 1, 2).
 * @returns {Promise<string[]>} A promise that resolves to a sorted array of unique section names.
 */
async function getUniqueSectionsForGrade(grade) {
    const sections = new Set();
    try {
        const gradeValue = (grade === 'R') ? 'R' : parseInt(grade, 10);
        const snapshot = await db.collection('sams_registrations')
            .where('grade', '==', gradeValue)
            .get();

        snapshot.forEach(doc => {
            const section = doc.data().section;
            if (section && section.trim() !== '') {
                sections.add(section.trim());
            }
        });
    } catch (error) {
        console.error("Error fetching unique sections:", error);
    }
    return Array.from(sections).sort();
}

// =========================================================
// === GRADE ASSIGNMENT TOOL FUNCTIONS ===
// =========================================================

/**
 * Updates the learner's document with the assigned section and the combined fullGradeSection.
 */
async function setLearnerSection(admissionId, grade, newSection) {
    const fullGradeSection = `${grade}${newSection}`;
    
    if (!confirm(`Are you sure you want to assign this learner to class ${fullGradeSection}? This will be the class displayed to teachers.`)) {
        return;
    }

    try {
        const snapshot = await db.collection('sams_registrations')
            .where('admissionId', '==', admissionId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            alert("Error: Learner document not found in database.");
            return;
        }

        const docRef = snapshot.docs[0].ref;
        
        await docRef.update({
            section: newSection,
            fullGradeSection: fullGradeSection
        });

        // 1. Update the global data object to reflect the new assignment
        if (selectedLearnerData && selectedLearnerData.admissionId === admissionId) {
            selectedLearnerData.section = newSection;
            selectedLearnerData.fullGradeSection = fullGradeSection;
        }

        // 2. Update the UI elements in the current detail view
        const displayElement = document.getElementById('current-section-display');
        const assignButton = document.getElementById('assign-section-button');

        if (displayElement) {
            displayElement.textContent = fullGradeSection;
            displayElement.style.color = 'var(--primary-green)';
        }
        
        alert(`Learner successfully assigned/updated to class ${fullGradeSection}! Use the 'Back' button to refresh the lists.`);
        
        // 3. Update button state to indicate success and prevent immediate re-submission
        if (assignButton) {
            assignButton.textContent = 'Assignment Confirmed';
            assignButton.disabled = true;
        }

    } catch (error) {
        console.error("Error updating learner section:", error);
        alert("An error occurred while assigning the section. Please try again.");
    }
}

/**
 * Unassigns a learner from their current class by setting section fields to null.
 * @param {string} admissionId - The admission ID of the learner to unassign.
 */
async function unassignLearnerFromClass(admissionId) {
    if (!confirm(`Are you sure you want to unassign this learner from their current class? They will be moved to the 'Unassigned' list.`)) {
        return;
    }

    try {
        const snapshot = await db.collection('sams_registrations')
            .where('admissionId', '==', admissionId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            alert("Error: Learner document not found in database.");
            return;
        }

        const docRef = snapshot.docs[0].ref;
        
        await docRef.update({
            section: null,
            fullGradeSection: null
        });

        // Update the global data object to reflect the change
        if (selectedLearnerData && selectedLearnerData.admissionId === admissionId) {
            selectedLearnerData.section = null;
            selectedLearnerData.fullGradeSection = null;
        }

        // Update the UI elements in the current detail view
        const displayElement = document.getElementById('current-section-display');
        if (displayElement) {
            displayElement.textContent = `${selectedLearnerData.grade} (Unassigned)`;
            displayElement.style.color = 'var(--primary-red)';
        }
        
        alert(`Learner successfully unassigned from their class. Use the 'Back' button to see the updated lists.`);

    } catch (error) {
        console.error("Error unassigning learner:", error);
        alert("An error occurred while unassigning the learner. Please try again.");
    }
}