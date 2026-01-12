import { showSection } from './navigation.js';

/**
 * Sets up the logic for the Academics section, including subject selection.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data.
 * @param {object} profileData - The full learner profile data.
 */
export function setupAcademicsSection(db, authData, profileData) {
    const viewSubjectsBtn = document.querySelector('.view-subjects-btn');
    const backToAcademicsBtn = document.getElementById('back-to-academics-btn');
    const subjectsContent = document.getElementById('subjects-content');

    if (!viewSubjectsBtn || !backToAcademicsBtn || !subjectsContent) return;

    // Handle navigation to the subjects section
    viewSubjectsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.sidebar a[href="#academics"]').classList.remove('active');
        showSection('subjects');
        renderSubjectsView(db, authData, profileData);
    });

    // Handle navigation back to the main academics view
    backToAcademicsBtn.addEventListener('click', () => {
        showSection('academics');
    });
}

/**
 * Renders the correct subject view based on the learner's grade.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data.
 * @param {object} profileData - The full learner profile data.
 */
async function renderSubjectsView(db, authData, profileData) {
    const subjectsContent = document.getElementById('subjects-content');
    const grade = parseInt(profileData.grade, 10); // 'R' will become NaN

    const foundationSubjects = ["Home Language", "First Additional Language", "Mathematics", "Life Skills"];
    
    // Define subject categories for Intersen Phase
    const languageOptions = ["Afrikaans", "English", "isiNdebele", "isiXhosa", "isiZulu", "Sepedi", "Sesotho", "Setswana", "siSwati", "Tshivenda", "Xitsonga"];

    subjectsContent.innerHTML = '<p>Loading subjects...</p>';

    if (isNaN(grade) || (grade >= 1 && grade <= 3)) { // Grade R, 1, 2, 3
        subjectsContent.innerHTML = `
            <p>As a Foundation Phase learner, you are enrolled in all core subjects.</p>
            <ul class="subject-list">
                ${foundationSubjects.map(subject => `<li>${subject}</li>`).join('')}
            </ul>
        `;
    } else if (grade >= 4 && grade <= 7) { // Grade 4-7
        try {
            const userDoc = await db.collection('users').doc(authData.uid).get();
            const savedData = profileData.subjectsData || (userDoc.exists ? userDoc.data().subjectsData || {} : {});

            // Define grade-specific compulsory subjects
            let compulsorySubjects;
            if (grade >= 4 && grade <= 6) {
                compulsorySubjects = ["Mathematics", "NS-Tech (Natural science and technology)", "Social Sciences", "Life Skills", "Coding and Robotics"];
            } else { // Grade 7
                compulsorySubjects = ["Mathematics", "N.S (Natural Sciences)", "Technology", "Social Sciences", "EMS", "Creative Arts", "Coding and Robotics"];
            }

            // If languages are already saved, show the list view
            if (savedData.homeLanguage && savedData.firstAdditionalLanguage) {
                subjectsContent.innerHTML = `
                    <p>Here are your registered subjects for Grade ${grade}.</p>
                    <ul class="subject-list">
                        <li>${savedData.homeLanguage} (HL)</li>
                        <li>${savedData.firstAdditionalLanguage} (FAL)</li>
                        ${compulsorySubjects.map(subject => `<li>${subject}</li>`).join('')}
                    </ul>
                    <div style="margin-top: 20px;">
                        <button id="edit-subjects-btn" class="cta-button-secondary"><i class="fas fa-pencil-alt"></i> Change Language Choices</button>
                    </div>
                `;
                document.getElementById('edit-subjects-btn').addEventListener('click', () => {
                    // To edit, we simply re-render the view, but clear the saved data for the function
                    const mockProfileData = { ...profileData, subjectsData: {} };
                    renderSubjectsView(db, authData, mockProfileData);
                });
            } else {
                // Otherwise, show the selection form
                subjectsContent.innerHTML = `
                    <p>Please select your languages. Your core and additional subjects are assigned automatically.</p>
                    <form id="subject-selection-form">
                        <div class="form-group">
                            <label for="home-language">Home Language</label>
                            <select id="home-language" required>
                                <option value="">-- Select a language --</option>
                                ${languageOptions.map(lang => `<option value="${lang}" ${savedData.homeLanguage === lang ? 'selected' : ''}>${lang}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="first-additional-language">First Additional Language</label>
                            <select id="first-additional-language" required>
                                <option value="">-- Select a language --</option>
                                ${languageOptions.map(lang => `<option value="${lang}" ${savedData.firstAdditionalLanguage === lang ? 'selected' : ''}>${lang}</option>`).join('')}
                            </select>
                        </div>

                        <div class="tool-card" style="margin-top: 25px;">
                            <h3><i class="fas fa-check-circle"></i> Compulsory Subjects</h3>
                            <ul class="subject-list" style="margin-top: 0;">
                                ${compulsorySubjects.map(subject => `<li>${subject}</li>`).join('')}
                            </ul>
                        </div>

                        <div style="margin-top: 20px;">
                            <button type="submit" class="cta-button"><i class="fas fa-save"></i> Save My Subjects</button>
                            <p id="save-subjects-status" class="status-message-box" style="display: none;"></p>
                        </div>
                    </form>
                `;
                 // Add event listener for the form submission
                document.getElementById('subject-selection-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    saveIntersenSubjects(db, authData, profileData, grade);
                });
            }

        } catch (error) {
            console.error("Error fetching user subjects:", error);
            subjectsContent.innerHTML = '<p class="error-message">Could not load your subject data. Please try again.</p>';
        }
    } else {
        subjectsContent.innerHTML = '<p>Your grade level is not set correctly. Please contact administration.</p>';
    }
}

/**
 * Saves the selected subjects for an Intersen Phase learner to Firestore.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data.
 * @param {object} profileData - The full learner profile data.
 * @param {number} grade - The learner's grade.
 */
async function saveIntersenSubjects(db, authData, profileData, grade) {
    const form = document.getElementById('subject-selection-form');
    const statusMessage = document.getElementById('save-subjects-status');
    const submitButton = form.querySelector('button[type="submit"]');

    const homeLanguage = document.getElementById('home-language').value;
    const firstAdditionalLanguage = document.getElementById('first-additional-language').value;

    if (!homeLanguage || !firstAdditionalLanguage) {
        alert('Please select both a Home Language and a First Additional Language.');
        return;
    }

    if (homeLanguage === firstAdditionalLanguage) {
        alert('Home Language and First Additional Language cannot be the same.');
        return;
    }

    let compulsorySubjects;
    if (grade >= 4 && grade <= 6) {
        compulsorySubjects = ["Mathematics", "NS-Tech (Natural science and technology)", "Social Sciences", "Life Skills", "Coding and Robotics"];
    } else { // Grade 7
        compulsorySubjects = ["Mathematics", "N.S (Natural Sciences)", "Technology", "Social Sciences", "EMS", "Creative Arts", "Coding and Robotics"];
    }

    const subjectsData = {
        homeLanguage: homeLanguage,
        firstAdditionalLanguage: firstAdditionalLanguage,
        compulsorySubjects: compulsorySubjects,
        gradeAtSelection: grade
    };

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
    statusMessage.style.display = 'none';

    try {
        const userRef = db.collection('users').doc(authData.uid);
        await userRef.set({ subjectsData: subjectsData }, { merge: true });

        statusMessage.textContent = 'Your subjects have been saved successfully!';
        statusMessage.className = 'status-message-box success';
        statusMessage.style.display = 'block';

        setTimeout(() => {
            // Update the local profileData object with the new subjects
            const updatedProfileData = { ...profileData, subjectsData: subjectsData };

            // Re-render the view to show the list instead of the form
            renderSubjectsView(db, authData, updatedProfileData);
        }, 3000);

    } catch (error) {
        console.error("Error saving subjects:", error);
        statusMessage.textContent = 'An error occurred. Please try again.';
        statusMessage.className = 'status-message-box error';
        statusMessage.style.display = 'block';
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save"></i> Save My Subjects';
    }
}