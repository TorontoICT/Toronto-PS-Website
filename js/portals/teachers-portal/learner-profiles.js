// js/portals/teachers-portal/learner-profiles.js

// **NEW**: Add a variable to store the full list of learners for the current class
let currentClassLearners = [];

/**
 * Sets up the initial state and event listeners for the Learner Profiles section.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's data.
 */
export function setupLearnerProfileSection(db, teacherData) {
    const classFilter = document.getElementById('profile-class-filter');
    const backButton = document.getElementById('back-to-learner-profile-list');
    const searchInput = document.getElementById('learner-profile-search');
    const clearSearchBtn = document.getElementById('clear-learner-search-btn');

    document.getElementById('learner-profile-list-view').style.display = 'block';
    document.getElementById('learner-profile-detail-view').style.display = 'none';

    classFilter.addEventListener('change', (e) => {
        const selectedClass = e.target.value;
        searchInput.value = ''; // Reset search on class change
        if (clearSearchBtn) clearSearchBtn.style.display = 'none'; // Hide clear button
        if (selectedClass) {
            loadLearnersForProfileList(db, selectedClass, teacherData);
        } else {
            currentClassLearners = [];
            renderLearnerProfileList([], teacherData.uid);
            document.getElementById('learner-profile-list-status').textContent = 'Please select a class to load learners.';
        }
    });

    backButton.addEventListener('click', () => {
        document.getElementById('learner-profile-list-view').style.display = 'block';
        document.getElementById('learner-profile-detail-view').style.display = 'none';
    });

    // Add event listener for the search input
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();

        // Show or hide the clear button based on input
        if (clearSearchBtn) {
            clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
        }

        const filteredLearners = currentClassLearners.filter(learner => {
            const fullName = `${learner.learnerName || ''} ${learner.learnerSurname || ''}`.toLowerCase();
            const admissionId = String(learner.admissionId || '').toLowerCase();
            return fullName.includes(searchTerm) || admissionId.includes(searchTerm);
        });
        renderLearnerProfileList(filteredLearners, teacherData.uid);
    });

    // Add event listener for the clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true })); // Trigger filter
            searchInput.focus();
        });
    }
}

/**
 * Loads and displays a list of learners for the selected class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} className - The class to load learners for.
 * @param {object} teacherData - The authenticated teacher's data.
 */
async function loadLearnersForProfileList(db, className, teacherData) {
    const status = document.getElementById('learner-profile-list-status');
    status.textContent = `Loading learners for class ${className}...`;
    renderLearnerProfileList([], teacherData.uid); // Clear previous results

    try {
        const snapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', className).get();
        if (snapshot.empty) {
            status.textContent = `No learners found in class ${className}.`;
            currentClassLearners = []; // Clear stored learners
            return;
        }

        currentClassLearners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        sortLearnersByName(currentClassLearners);

        renderLearnerProfileList(currentClassLearners, teacherData.uid);
    } catch (error) {
        console.error("Error loading learners for profile list:", error);
        status.textContent = 'An error occurred while loading learners.';
        currentClassLearners = []; // Clear on error
    }
}

/**
 * Renders the learner list into the DOM based on an array of learner objects.
 * @param {Array} learners - An array of learner objects to display.
 * @param {string} teacherUid - The UID of the teacher to pass to the onclick handler.
 */
function renderLearnerProfileList(learners, teacherUid) {
    const container = document.getElementById('learner-profile-list-container');
    const status = document.getElementById('learner-profile-list-status');
    container.innerHTML = '';

    if (learners.length === 0) {
        const searchInput = document.getElementById('learner-profile-search');
        if (searchInput && searchInput.value) {
            status.textContent = 'No learners match your search criteria.';
        }
        // If search is empty, the message from loadLearnersForProfileList will be shown.
        return;
    }

    let listHTML = '<ul class="resource-list">';
    learners.forEach(learner => {
        listHTML += `
            <li>
                <i class="fas fa-user-graduate"></i>
                <div>
                    <h3>${formatLearnerName(learner)}</h3>
                    <p>Admission No: ${learner.admissionId}</p>
                </div>
                <button class="cta-button-small" onclick="showLearnerProfileDetail('${learner.id}', '${teacherUid}')">View Profile</button>
            </li>`;
    });
    listHTML += '</ul>';
    container.innerHTML = listHTML;

    const totalLearners = currentClassLearners.length;
    if (learners.length === totalLearners) {
        status.textContent = `Displaying ${totalLearners} learner(s).`;
    } else {
        status.textContent = `Displaying ${learners.length} of ${totalLearners} matching learner(s).`;
    }
}

/**
 * Fetches and displays the detailed profile for a single learner.
 * @param {string} learnerDocId - The Firestore document ID of the learner.
 * @param {string} teacherUid - The UID of the currently logged-in teacher.
 */
async function showLearnerProfileDetail(learnerDocId, teacherUid) {
    document.getElementById('learner-profile-list-view').style.display = 'none';
    document.getElementById('learner-profile-detail-view').style.display = 'block';

    const contentContainer = document.getElementById('learner-profile-content');
    contentContainer.innerHTML = '<p class="data-status-message">Loading learner profile...</p>';

    const db = firebase.firestore();

    try {
        const learnerDoc = await db.collection('sams_registrations').doc(learnerDocId).get();
        if (!learnerDoc.exists) throw new Error("Learner document not found.");
        const learnerData = learnerDoc.data();

        const profileHTML = `
            <div class="learner-profile-document">
                <div class="document-header">
                    <h2>LEARNER PROFILE GRADES R – 12 (CONFIDENTIAL)</h2>
                    <p class="confidential-notice">
                        This is a legal document and information may not be removed. It must be made available by the principal of the school from which the learner has been transferred once the transfer document has been issued, to the principal of the school to which the learner is being moved. It should be posted or personally and officially handed over to the receiving principal and not given to the learner’s parents/guardian (of the learner).
                        <br>This profile must be completed in print at least annually by the register teacher. No Tippex may be used.
                        <br>When information is included in the area marked by an asterisk (*), the teacher should complete the Support Needs Assessment Form of the Strategy on Screening, Identification, Assessment and Support (SIAS).
                    </p>
                </div>

                <div class="photo-section">
                    <div class="photo-box">
                        <img src="${learnerData.photoUrl_Foundation || '../../images/placeholder-profile.png'}" alt="Foundation Phase Photo">
                        <label>FOUNDATION PHASE</label>
                    </div>
                    <div class="photo-box">
                        <img src="${learnerData.photoUrl_Intermediate || '../../images/placeholder-profile.png'}" alt="Intermediate Phase Photo">
                        <label>INTERMEDIATE PHASE</label>
                    </div>
                    <div class="photo-box">
                        <img src="${learnerData.photoUrl_Senior || '../../images/placeholder-profile.png'}" alt="Senior Phase Photo">
                        <label>SENIOR PHASE</label>
                    </div>
                    <div class="photo-box">
                        <img src="${learnerData.photoUrl_FET || '../../images/placeholder-profile.png'}" alt="FET Phase Photo">
                        <label>FET PHASE</label>
                    </div>
                </div>

                <h3 class="section-title">PERSONAL INFORMATION</h3>
                <table class="profile-table">
                    <tr>
                        <th>Surname</th>
                        <td>${learnerData.learnerName || 'N/A'}</td>
                        <th>Names</th>
                        <td colspan="3">${learnerData.learnerSurname || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Name by which learner is called</th>
                        <td>${learnerData.learnerOthername || learnerData.learnerSurname || 'N/A'}</td>
                        <th>Home language</th>
                        <td>${learnerData.homeLanguage || 'N/A'}</td>
                        <th>ID number (birth certificate)</th>
                        <td>${learnerData.learnerID || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Sex (M/F)</th>
                        <td>${learnerData.learnerGender ? learnerData.learnerGender.charAt(0).toUpperCase() : 'N/A'}</td>
                        <th>Number of children in household</th>
                        <td>${learnerData.childrenInHousehold || 'N/A'}</td>
                        <td colspan="2">
                            <strong>Position in family:</strong>
                            <span class="checkbox-item">${learnerData.positionInFamily === 'Only child' ? '[X]' : '[ ]'} Only child</span>
                            <span class="checkbox-item">${learnerData.positionInFamily === 'First child' ? '[X]' : '[ ]'} First child</span>
                            <span class="checkbox-item">${learnerData.positionInFamily === 'Second child' ? '[X]' : '[ ]'} Second child</span>
                            <span class="checkbox-item">${learnerData.positionInFamily === 'Third child' ? '[X]' : '[ ]'} Third child</span>
                            <span class="checkbox-item">${learnerData.positionInFamily === 'Fourth child' ? '[X]' : '[ ]'} Fourth child</span>
                            <span class="checkbox-item">${learnerData.positionInFamily === 'Fifth / more' ? '[X]' : '[ ]'} Fifth / more</span>
                        </td>
                    </tr>
                    <tr>
                        <th>Religion</th>
                        <td>${learnerData.religion || 'N/A'}</td>
                        <th>Disability (if any)</th>
                        <td>${learnerData.disability || 'N/A'}</td>
                        <th>Type of social grant</th>
                        <td colspan="2">${learnerData.socialGrant || 'N/A'}</td>
                    </tr>
                </table>

                <h3 class="section-title">MEDICAL INFORMATION</h3>
                <table class="profile-table">
                    <tr>
                        <th>Family doctor/Clinic</th>
                        <td>${learnerData.doctorContact || 'N/A'}</td>
                        <th>Contact no</th>
                        <td>${learnerData.doctorContactNumber || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Allergies (indicate in RED)</th>
                        <td class="allergy-info" colspan="3">${learnerData.allergies || 'None'}</td>
                    </tr>
                    <tr>
                        <th>Chronic illness</th>
                        <td colspan="3">${learnerData.medicalConditions || 'None'}</td>
                    </tr>
                    <tr>
                        <th>Name of Medical Aid</th>
                        <td>${learnerData.medicalAid || 'N/A'}</td>
                        <th>Medical Aid no.</th>
                        <td>${learnerData.medicalAidNumber || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Name of principal member</th>
                        <td colspan="3">${learnerData.medicalAidPrincipal || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Contact person in case of emergency</th>
                        <td>${learnerData.emergencyContactName || 'N/A'}</td>
                        <th>Contact no</th>
                        <td>${learnerData.emergencyContactNumber || 'N/A'}</td>
                    </tr>
                </table>
                <table class="profile-table" style="margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>Road to Health Card shown? [Yes/No]</th>
                            <th>*Any indication of problems with regard to</th>
                            <th>Yes/No</th>
                            <th>*Remark(s) if “YES”</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td rowspan="6">${learnerData.roadToHealthCardShown ? 'Yes' : 'No'}</td>
                            <td>Child’s growth progress</td><td></td><td></td>
                        </tr>
                        <tr><td>Prenatal/postnatal information</td><td></td><td></td></tr>
                        <tr><td>Immunisation record (birth to 5 years)</td><td></td><td></td></tr>
                        <tr><td>Visual/hearing/height/weight/speech/physical/locomotor screening results</td><td></td><td></td></tr>
                        <tr><td>Hospital admissions</td><td></td><td></td></tr>
                        <tr><td>Any developmental problems in the “In need of special care” section?</td><td></td><td></td></tr>
                        <tr><td>Any chronic condition?</td><td></td><td></td><td></td></tr>
                    </tbody>
                </table>

                <h3 class="section-title">INFORMATION REGARDING PARENT(S) OR GUARDIANS</h3>
                <table class="profile-table">
                    <thead>
                        <tr><th></th><th>Father</th><th>Mother</th><th>Guardian</th></tr>
                    </thead>
                    <tbody>
                        <tr><th>Surname & Initials</th><td>${learnerData.parent1Name || ''}</td><td>${learnerData.parent2Name || ''}</td><td></td></tr>
                        <tr><th>Occupation</th><td>${learnerData.parent1Occupation || ''}</td><td>${learnerData.parent2Occupation || ''}</td><td></td></tr>
                        <tr><th>Physical address</th><td>${learnerData.parent1Address || ''}</td><td>${learnerData.parent2Address || ''}</td><td></td></tr>
                        <tr><th>Postal address</th><td>${learnerData.parent1PostalAddress || ''}</td><td>${learnerData.parent2PostalAddress || ''}</td><td></td></tr>
                        <tr><th>City/Town</th><td>${learnerData.parent1City || ''}</td><td>${learnerData.parent2City || ''}</td><td></td></tr>
                        <tr><th>Telephone (home)</th><td>${learnerData.parent1HomeTel || ''}</td><td>${learnerData.parent2HomeTel || ''}</td><td></td></tr>
                        <tr><th>Telephone (work)</th><td>${learnerData.parent1WorkTel || ''}</td><td>${learnerData.parent2WorkTel || ''}</td><td></td></tr>
                        <tr><th>Cell phone</th><td>${learnerData.parent1Contact || ''}</td><td>${learnerData.parent2Contact || ''}</td><td></td></tr>
                        <tr><th>Email address</th><td>${learnerData.parent1Email || ''}</td><td>${learnerData.parent2Email || ''}</td><td></td></tr>
                    </tbody>
                </table>

                <h3 class="section-title">PERSON(S) WITH WHOM THE LEARNER LIVES</h3>
                <table class="profile-table">
                    <thead><tr><th>Surname & initials</th><th>ID Number</th><th>Contact details</th><th>Relationship</th></tr></thead>
                    <tbody><tr><td>${learnerData.livingWith_Name || 'N/A'}</td><td>${learnerData.livingWith_ID || 'N/A'}</td><td>${learnerData.livingWith_Contact || 'N/A'}</td><td>${learnerData.livingWith_Relationship || 'N/A'}</td></tr></tbody>
                </table>

                <h3 class="section-title">PERSONS AUTHORISED TO COLLECT THE LEARNER FROM SCHOOL</h3>
                <table class="profile-table">
                    <thead><tr><th>Surname & initials</th><th>ID Number</th><th>Contact details</th><th>Relationship</th></tr></thead>
                    <tbody><tr><td>${learnerData.authorizedCollection_Name || 'N/A'}</td><td>${learnerData.authorizedCollection_ID || 'N/A'}</td><td>${learnerData.authorizedCollection_Contact || 'N/A'}</td><td>${learnerData.authorizedCollection_Relationship || 'N/A'}</td></tr></tbody>
                </table>
                
                <h3 class="section-title">EARLY INTERVENTION SERVICES RENDERED (0 – 5 year)</h3>
                <table class="profile-table">
                    <thead><tr><th>Area of need</th><th>Services and interventions received</th></tr></thead>
                    <tbody><tr><td>${learnerData.earlyIntervention_Need || 'N/A'}</td><td>${learnerData.earlyIntervention_Services || 'N/A'}</td></tr></tbody>
                </table>

                <h3 class="section-title">SCHOOLS ATTENDED</h3>
                <table class="profile-table">
                    <thead><tr><th>Name of school</th><th>EMIS no</th><th>LOLT</th><th>Admission Date/Gr</th><th>Departure Date/Gr</th></tr></thead>
                    <tbody><tr><td>${learnerData.prevSchool || 'N/A'}</td><td></td><td></td><td></td><td></td></tr></tbody>
                </table>

                <h3 class="section-title">AREAS NEEDING ONGOING SUPPORT</h3>
                <table class="profile-table">
                    <thead><tr><th>MM/YY</th><th>Gr</th><th>Area of need</th><th>Nature of support</th><th>Review Date</th></tr></thead>
                    <tbody><tr><td></td><td></td><td>${learnerData.supportNeeds || 'N/A'}</td><td></td><td></td></tr></tbody>
                </table>

                <h3 class="section-title">PARTICIPATION IN EXTRA (CO)-CURRICULAR ACTIVITIES</h3>
                <table class="profile-table">
                    <thead><tr><th>Year</th><th>Gr</th><th>Activity</th><th>Certificate</th><th>Organisation/other</th></tr></thead>
                    <tbody><tr><td></td><td></td><td>${learnerData.activities || 'N/A'}</td><td></td><td></td></tr></tbody>
                </table>

                <h3 class="section-title">ACHIEVEMENTS</h3>
                <table class="profile-table">
                    <thead><tr><th>Year</th><th>Gr</th><th>Activity</th></tr></thead>
                    <tbody><tr><td></td><td></td><td>${learnerData.achievements || 'N/A'}</td></tr></tbody>
                </table>

                <div class="page-break"></div>

                <h3 class="section-title">CUMULATIVE RECORD CARD</h3>
                <div class="cumulative-record-card">
                    <h4>FOUNDATION PHASE</h4>
                    <table class="profile-table">
                        <thead>
                            <tr><th>Year</th><th>Grade</th><th>Progress</th><th>Home Language</th><th>First Additional Language</th><th>Mathematics</th><th>Life Skills</th><th>Comment</th><th>Number of days absent</th><th>Promotion Y / N</th></tr>
                        </thead>
                        <tbody>
                            <tr><td></td><td>R</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                            <tr><td></td><td>1</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                            <tr><td></td><td>2</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                            <tr><td></td><td>3</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                        </tbody>
                    </table>

                    <h4>INTERMEDIATE PHASE</h4>
                    <table class="profile-table">
                        <thead>
                            <tr><th>Year</th><th>Grade</th><th>Progress</th><th>Home Language</th><th>First Additional Language</th><th>Mathematics</th><th>Natural Sciences</th><th>Social Sciences</th><th>Life Skills</th><th>Number of days absent</th><th>Promotion Y / N</th></tr>
                        </thead>
                        <tbody>
                            <tr><td></td><td>4</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                            <tr><td></td><td>5</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                            <tr><td></td><td>6</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                        </tbody>
                    </table>

                    <h4>SENIOR PHASE</h4>
                    <table class="profile-table">
                        <thead>
                            <tr><th>Year</th><th>Grade</th><th>Progress</th><th>Home Language</th><th>First Additional Language</th><th>Mathematics</th><th>Natural Sciences</th><th>Social Sciences</th><th>Life Skills</th><th>COMMENTS</th><th>Number of days absent</th><th>PROMOTION Y/N</th></tr>
                        </thead>
                        <tbody>
                            <tr><td></td><td>7</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        contentContainer.innerHTML = `
            <div class="profile-header no-print" style="position: relative;">
                <img src="${learnerData.photoUrl || '../../images/placeholder-profile.png'}" alt="Learner Photo" class="profile-pic-large">
                <div class="profile-header-info">
                    <a href="#" id="edit-learner-btn" class="cta-button-edit" style="position: absolute; top: 15px; right: 15px;"><i class="fas fa-user-edit"></i> Edit Info</a>
                    <button id="print-learner-profile-btn" class="cta-button-edit" style="position: absolute; top: 15px; right: 130px;"><i class="fas fa-print"></i> Print</button>
                    <h2>${formatLearnerName(learnerData)}</h2>
                    <p><strong>Admission No:</strong> ${learnerData.admissionId}</p>
                    <p><strong>Class:</strong> ${learnerData.fullGradeSection}</p>
                </div>
            </div>
            ${profileHTML}
            <div class="no-print" style="margin-top: 30px;">
                 <h3><i class="fas fa-comments"></i> Behavioral Comments & Observations</h3>
                 <div id="learner-comments-history" class="comments-container scroll-container" style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; padding: 10px; margin-bottom: 10px;">
                    <p class="data-status-message">Loading comments...</p>
                </div>
                 <form id="add-comment-form">
                    <div class="form-group">
                        <label for="new-comment-text">Add a New Comment</label>
                        <textarea id="new-comment-text" rows="3" placeholder="Enter your observation..." required></textarea>
                    </div>
                    <button type="submit" class="cta-button"><i class="fas fa-plus-circle"></i> Save Comment</button>
                    <p id="comment-status-message" class="status-message-box" style="display: none;"></p>
                </form>
            </div>
            <div class="tool-card no-print" style="margin-top: 20px;">
                <h3><i class="fas fa-folder-open"></i> Learner Documents</h3>
                <ul id="learner-document-links" class="resource-list"></ul>
            </div>`;

        loadBehavioralComments(db, learnerDocId);
        document.getElementById('add-comment-form').onsubmit = (e) => {
            e.preventDefault();
            saveBehavioralComment(db, learnerDocId, JSON.parse(sessionStorage.getItem('currentUser')));
        };

        document.getElementById('print-learner-profile-btn').addEventListener('click', (e) => {
            e.preventDefault();
            window.print();
        });

        // **NEW**: Set up the editing functionality for this learner
        setupLearnerInfoEditing(db, learnerDocId, learnerData, teacherUid);
        displayLearnerDocuments(learnerData);
    } catch (error) {
        console.error("Error showing learner profile detail:", error);
        contentContainer.innerHTML = '<p class="data-status-message error">Could not load learner profile.</p>';
    }
}

/**
 * Sets up the event listeners and logic for editing a specific learner's information.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} learnerDocId - The Firestore document ID of the learner being viewed.
 * @param {object} learnerData - The current data of the learner.
 * @param {string} teacherUid - The UID of the currently logged-in teacher.
 */
function setupLearnerInfoEditing(db, learnerDocId, learnerData, teacherUid) {
    const editBtn = document.getElementById('edit-learner-btn');
    const cancelBtn = document.getElementById('cancel-edit-learner-info-btn');
    const profileContent = document.getElementById('learner-profile-content');
    const editFormContainer = document.getElementById('edit-learner-info-form-container');
    const editForm = document.getElementById('edit-learner-info-form');

    // **NEW**: State for cropped files
    let croppedFiles = {}; 
    let currentCropper = null;

    // Helper to determine current phase field based on learner's grade
    const getPhaseField = (grade) => {
        const g = String(grade).toUpperCase();
        if (['R', '1', '2', '3'].includes(g)) return 'photoUrl_Foundation';
        if (['4', '5', '6'].includes(g)) return 'photoUrl_Intermediate';
        if (['7', '8', '9'].includes(g)) return 'photoUrl_Senior';
        if (['10', '11', '12'].includes(g)) return 'photoUrl_FET';
        return null;
    };
    const currentPhaseField = getPhaseField(learnerData.grade);

    if (!editBtn || !cancelBtn || !profileContent || !editFormContainer || !editForm) {
        console.error("One or more elements for learner editing are missing from the DOM.");
        return;
    }

    // **NEW**: Multi-step form logic
    const fieldsets = editForm.querySelectorAll('fieldset');
    const prevBtn = document.getElementById('btn-prev-step');
    const nextBtn = document.getElementById('btn-next-step');
    const saveBtn = document.getElementById('btn-save-changes');
    const stepIndicator = document.getElementById('step-indicator');
    let currentStep = 0;

    const updateStepVisibility = () => {
        fieldsets.forEach((fs, index) => {
            fs.style.display = index === currentStep ? 'block' : 'none';
        });

        if (prevBtn) prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-block';
        
        if (nextBtn && saveBtn) {
            if (currentStep === fieldsets.length - 1) {
                nextBtn.style.display = 'none';
                saveBtn.style.display = 'inline-block';
            } else {
                nextBtn.style.display = 'inline-block';
                saveBtn.style.display = 'none';
            }
        }

        if (stepIndicator) stepIndicator.textContent = `Step ${currentStep + 1} of ${fieldsets.length}`;
        editFormContainer.scrollIntoView({ behavior: 'smooth' });
    };

    if (prevBtn) prevBtn.onclick = () => { if (currentStep > 0) { currentStep--; updateStepVisibility(); } };
    if (nextBtn) nextBtn.onclick = () => { if (currentStep < fieldsets.length - 1) { currentStep++; updateStepVisibility(); } };

    // Show the edit form
    editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Populate the form with the learner's current data
        // Learner Details
        document.getElementById('edit-learner-info-name').value = learnerData.learnerSurname || '';
        document.getElementById('edit-learner-info-othername').value = learnerData.learnerOthername || '';
        document.getElementById('edit-learner-info-surname').value = learnerData.learnerName || '';
        
        // Reset file inputs and cropped files state
        document.getElementById('edit-learner-photo-foundation').value = '';
        document.getElementById('edit-learner-photo-intermediate').value = '';
        document.getElementById('edit-learner-photo-senior').value = '';
        document.getElementById('edit-learner-photo-fet').value = '';
        croppedFiles = {}; 

        // **NEW**: Setup Cropper Logic
        const setupCropperForInput = (inputId) => {
            const input = document.getElementById(inputId);
            const statusDiv = input.nextElementSibling; // The div for status messages

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Validate file type
                    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
                        alert('Invalid file type. Please upload a JPG or PNG image.');
                        input.value = ''; // Clear the input
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const cropModal = document.getElementById('crop-modal');
                        const imageElement = document.getElementById('image-to-crop');
                        imageElement.src = evt.target.result;
                        cropModal.style.display = 'flex';

                        if (currentCropper) currentCropper.destroy();
                        currentCropper = new Cropper(imageElement, {
                            aspectRatio: 1, // Square crop for profile photos
                            viewMode: 1,
                            autoCropArea: 1,
                        });

                        document.getElementById('btn-crop-save').onclick = () => {
                            currentCropper.getCroppedCanvas({ width: 300, height: 300 }).toBlob((blob) => {
                                croppedFiles[inputId] = blob; // Store the cropped blob
                                statusDiv.innerHTML = '<span style="color: var(--primary-green); font-size: 0.8em;"><i class="fas fa-check"></i> Photo Cropped & Ready</span>';
                                cropModal.style.display = 'none';
                            }, 'image/jpeg', 0.9);
                        };

                        document.getElementById('btn-crop-cancel').onclick = () => {
                            cropModal.style.display = 'none';
                            input.value = ''; // Clear input if cancelled
                            delete croppedFiles[inputId];
                            statusDiv.innerHTML = '';
                        };
                        
                        document.getElementById('crop-modal-close').onclick = document.getElementById('btn-crop-cancel').onclick;
                    };
                    reader.readAsDataURL(file);
                }
            };
        };

        ['edit-learner-photo-foundation', 'edit-learner-photo-intermediate', 'edit-learner-photo-senior', 'edit-learner-photo-fet']
            .forEach(id => setupCropperForInput(id));

        // Setup Photo Removal Buttons
        const phases = [
            { id: 'foundation', field: 'photoUrl_Foundation', label: 'Foundation' },
            { id: 'intermediate', field: 'photoUrl_Intermediate', label: 'Intermediate' },
            { id: 'senior', field: 'photoUrl_Senior', label: 'Senior' },
            { id: 'fet', field: 'photoUrl_FET', label: 'FET' }
        ];

        phases.forEach(phase => {
            const container = document.getElementById(`status-photo-${phase.id}`);
            if (container) {
                container.innerHTML = ''; // Clear previous
                if (learnerData[phase.field]) {
                    const wrapper = document.createElement('div');
                    wrapper.style.display = 'flex';
                    wrapper.style.alignItems = 'center';
                    wrapper.style.gap = '5px';
                    wrapper.style.marginTop = '5px';

                    const link = document.createElement('a');
                    link.href = learnerData[phase.field];
                    link.target = '_blank';
                    link.className = 'cta-button-small secondary';
                    link.style.padding = '2px 6px';
                    link.style.fontSize = '0.7rem';
                    link.innerHTML = '<i class="fas fa-eye"></i>';
                    link.title = "View Current Photo";

                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'cta-button-small danger';
                    btn.style.padding = '2px 6px';
                    btn.style.fontSize = '0.7rem';
                    btn.innerHTML = '<i class="fas fa-trash"></i>';
                    btn.title = "Remove Photo";
                    
                    btn.onclick = async () => {
                        if (confirm(`Are you sure you want to remove the ${phase.label} Phase photo?`)) {
                            try {
                                btn.disabled = true;
                                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                                
                                const updatePayload = {
                                    [phase.field]: firebase.firestore.FieldValue.delete()
                                };
                                // If this phase corresponds to the learner's current grade, remove the main photo too
                                if (phase.field === currentPhaseField) {
                                    updatePayload.photoUrl = firebase.firestore.FieldValue.delete();
                                }

                                await db.collection('sams_registrations').doc(learnerDocId).update(updatePayload);
                                delete learnerData[phase.field]; // Update local state
                                if (phase.field === currentPhaseField) {
                                    delete learnerData.photoUrl;
                                }
                                container.innerHTML = '<span style="color: #ef4444; font-size: 0.8em;">Photo Removed</span>';
                            } catch (err) {
                                console.error(err);
                                alert('Error removing photo.');
                                btn.disabled = false;
                                btn.innerHTML = '<i class="fas fa-trash"></i>';
                            }
                        }
                    };

                    wrapper.appendChild(link);
                    wrapper.appendChild(btn);
                    container.appendChild(wrapper);
                }
            }
        });

        document.getElementById('edit-learner-info-id').value = learnerData.learnerID || 'Not Found';
        document.getElementById('edit-learner-info-dob').value = learnerData.learnerDOB ? learnerData.learnerDOB.split('T')[0] : '';
        document.getElementById('edit-learner-info-gender').value = learnerData.learnerGender || 'male';
        document.getElementById('edit-learner-info-nationality').value = learnerData.learnerNationality || '';
        document.getElementById('edit-learner-info-race').value = learnerData.learnerRace || 'african';
        document.getElementById('edit-learner-info-language').value = learnerData.homeLanguage || learnerData.learnerLanguage || '';
        document.getElementById('edit-learner-children').value = learnerData.childrenInHousehold || '';
        document.getElementById('edit-learner-position').value = learnerData.positionInFamily || '';
        document.getElementById('edit-learner-religion').value = learnerData.religion || '';
        document.getElementById('edit-learner-disability').value = learnerData.disability || '';
        document.getElementById('edit-learner-social-grant').value = learnerData.socialGrant || '';
        document.getElementById('edit-learner-info-prev-school').value = learnerData.prevSchool || '';

        // Parent 1 Details
        document.getElementById('edit-parent1-name').value = learnerData.parent1Name || '';
        document.getElementById('edit-parent1-occupation').value = learnerData.parent1Occupation || '';
        document.getElementById('edit-parent1-contact').value = learnerData.parent1Contact || '';
        document.getElementById('edit-parent1-email').value = learnerData.parent1Email || '';
        document.getElementById('edit-parent1-home-tel').value = learnerData.parent1HomeTel || '';
        document.getElementById('edit-parent1-work-tel').value = learnerData.parent1WorkTel || '';
        document.getElementById('edit-parent1-city').value = learnerData.parent1City || '';
        document.getElementById('edit-parent1-address').value = learnerData.parent1Address || '';
        document.getElementById('edit-parent1-postal').value = learnerData.parent1PostalAddress || '';

        // Parent 2 Details
        document.getElementById('edit-parent2-name').value = learnerData.parent2Name || '';
        document.getElementById('edit-parent2-occupation').value = learnerData.parent2Occupation || '';
        document.getElementById('edit-parent2-contact').value = learnerData.parent2Contact || '';
        document.getElementById('edit-parent2-email').value = learnerData.parent2Email || '';
        document.getElementById('edit-parent2-home-tel').value = learnerData.parent2HomeTel || '';
        document.getElementById('edit-parent2-work-tel').value = learnerData.parent2WorkTel || '';
        document.getElementById('edit-parent2-city').value = learnerData.parent2City || '';
        document.getElementById('edit-parent2-address').value = learnerData.parent2Address || '';
        document.getElementById('edit-parent2-postal').value = learnerData.parent2PostalAddress || '';

        // Medical & Other
        document.getElementById('edit-medical-conditions').value = learnerData.medicalConditions || '';
        document.getElementById('edit-allergies').value = learnerData.allergies || '';
        document.getElementById('edit-doctor-contact').value = learnerData.doctorContact || '';
        document.getElementById('edit-doctor-number').value = learnerData.doctorContactNumber || '';
        document.getElementById('edit-medical-aid').value = learnerData.medicalAid || '';
        document.getElementById('edit-medical-aid-no').value = learnerData.medicalAidNumber || '';
        document.getElementById('edit-medical-aid-principal').value = learnerData.medicalAidPrincipal || '';
        document.getElementById('edit-emergency-name').value = learnerData.emergencyContactName || '';
        document.getElementById('edit-emergency-number').value = learnerData.emergencyContactNumber || '';
        
        // Living With
        document.getElementById('edit-living-name').value = learnerData.livingWith_Name || '';
        document.getElementById('edit-living-id').value = learnerData.livingWith_ID || '';
        document.getElementById('edit-living-contact').value = learnerData.livingWith_Contact || '';
        document.getElementById('edit-living-relationship').value = learnerData.livingWith_Relationship || '';

        // Collection
        document.getElementById('edit-collection-name').value = learnerData.authorizedCollection_Name || '';
        document.getElementById('edit-collection-id').value = learnerData.authorizedCollection_ID || '';
        document.getElementById('edit-collection-contact').value = learnerData.authorizedCollection_Contact || '';
        document.getElementById('edit-collection-relationship').value = learnerData.authorizedCollection_Relationship || '';

        document.getElementById('edit-intervention-need').value = learnerData.earlyIntervention_Need || '';
        document.getElementById('edit-intervention-services').value = learnerData.earlyIntervention_Services || '';
        document.getElementById('edit-support-needs').value = learnerData.supportNeeds || '';
        document.getElementById('edit-activities').value = learnerData.activities || '';
        document.getElementById('edit-achievements').value = learnerData.achievements || '';

        // Hide the profile view and show the edit form
        profileContent.style.display = 'none';
        editFormContainer.style.display = 'block';
        editFormContainer.scrollIntoView({ behavior: 'smooth' });

        // Reset to first step when opening form
        currentStep = 0;
        updateStepVisibility();
    });

    // Hide the edit form and show the profile view
    cancelBtn.addEventListener('click', () => {
        profileContent.style.display = 'block';
        editFormContainer.style.display = 'none';
    });

    // Handle form submission to save changes
    // **FIX**: Use onsubmit to prevent stacking listeners if this function is called multiple times
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        const statusMessage = document.getElementById('edit-learner-info-status');
        const submitButton = editForm.querySelector('button[type="submit"]');

        const updatedData = {
            // Learner fields
            learnerName: document.getElementById('edit-learner-info-name').value.trim(),
            learnerOthername: document.getElementById('edit-learner-info-othername').value.trim(),
            learnerSurname: document.getElementById('edit-learner-info-surname').value.trim(),
            learnerID: document.getElementById('edit-learner-info-id').value.trim(),
            learnerDOB: document.getElementById('edit-learner-info-dob').value,
            learnerGender: document.getElementById('edit-learner-info-gender').value,
            learnerNationality: document.getElementById('edit-learner-info-nationality').value.trim(),
            learnerRace: document.getElementById('edit-learner-info-race').value,
            homeLanguage: document.getElementById('edit-learner-info-language').value.trim(), // Use homeLanguage for consistency
            childrenInHousehold: document.getElementById('edit-learner-children').value.trim(),
            positionInFamily: document.getElementById('edit-learner-position').value,
            religion: document.getElementById('edit-learner-religion').value.trim(),
            disability: document.getElementById('edit-learner-disability').value.trim(),
            socialGrant: document.getElementById('edit-learner-social-grant').value.trim(),
            prevSchool: document.getElementById('edit-learner-info-prev-school').value.trim(),

            // Parent 1 fields
            parent1Name: document.getElementById('edit-parent1-name').value.trim(),
            parent1Occupation: document.getElementById('edit-parent1-occupation').value.trim(),
            parent1Contact: document.getElementById('edit-parent1-contact').value.trim(),
            parent1Email: document.getElementById('edit-parent1-email').value.trim(),
            parent1HomeTel: document.getElementById('edit-parent1-home-tel').value.trim(),
            parent1WorkTel: document.getElementById('edit-parent1-work-tel').value.trim(),
            parent1City: document.getElementById('edit-parent1-city').value.trim(),
            parent1Address: document.getElementById('edit-parent1-address').value.trim(),
            parent1PostalAddress: document.getElementById('edit-parent1-postal').value.trim(),

            // Parent 2 fields
            parent2Name: document.getElementById('edit-parent2-name').value.trim(),
            parent2Occupation: document.getElementById('edit-parent2-occupation').value.trim(),
            parent2Contact: document.getElementById('edit-parent2-contact').value.trim(),
            parent2Email: document.getElementById('edit-parent2-email').value.trim(),
            parent2HomeTel: document.getElementById('edit-parent2-home-tel').value.trim(),
            parent2WorkTel: document.getElementById('edit-parent2-work-tel').value.trim(),
            parent2City: document.getElementById('edit-parent2-city').value.trim(),
            parent2Address: document.getElementById('edit-parent2-address').value.trim(),
            parent2PostalAddress: document.getElementById('edit-parent2-postal').value.trim(),

            // Medical & Other
            medicalConditions: document.getElementById('edit-medical-conditions').value.trim(),
            allergies: document.getElementById('edit-allergies').value.trim(),
            doctorContact: document.getElementById('edit-doctor-contact').value.trim(),
            doctorContactNumber: document.getElementById('edit-doctor-number').value.trim(),
            medicalAid: document.getElementById('edit-medical-aid').value.trim(),
            medicalAidNumber: document.getElementById('edit-medical-aid-no').value.trim(),
            medicalAidPrincipal: document.getElementById('edit-medical-aid-principal').value.trim(),
            emergencyContactName: document.getElementById('edit-emergency-name').value.trim(),
            emergencyContactNumber: document.getElementById('edit-emergency-number').value.trim(),
            
            livingWith_Name: document.getElementById('edit-living-name').value.trim(),
            livingWith_ID: document.getElementById('edit-living-id').value.trim(),
            livingWith_Contact: document.getElementById('edit-living-contact').value.trim(),
            livingWith_Relationship: document.getElementById('edit-living-relationship').value.trim(),

            authorizedCollection_Name: document.getElementById('edit-collection-name').value.trim(),
            authorizedCollection_ID: document.getElementById('edit-collection-id').value.trim(),
            authorizedCollection_Contact: document.getElementById('edit-collection-contact').value.trim(),
            authorizedCollection_Relationship: document.getElementById('edit-collection-relationship').value.trim(),

            earlyIntervention_Need: document.getElementById('edit-intervention-need').value.trim(),
            earlyIntervention_Services: document.getElementById('edit-intervention-services').value.trim(),
            supportNeeds: document.getElementById('edit-support-needs').value.trim(),
            activities: document.getElementById('edit-activities').value.trim(),
            achievements: document.getElementById('edit-achievements').value.trim(),

            lastUpdatedBy: teacherUid, // **FIXED**: Use the UID passed from sessionStorage.
            lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp() // Timestamp the change
        };

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
        statusMessage.style.display = 'none';

        try {
            // Helper to upload photo for a specific phase
            const uploadPhasePhoto = async (inputId, fieldName) => {
                // **MODIFIED**: Check for cropped file first, then fallback to input file
                let fileToUpload = croppedFiles[inputId];
                if (!fileToUpload) {
                    const photoInput = document.getElementById(inputId);
                    if (photoInput && photoInput.files.length > 0) {
                        fileToUpload = photoInput.files[0];
                    }
                }

                if (fileToUpload) {
                    const storageRef = firebase.storage().ref();
                    // Use a generic name for blobs or the original name if available
                    const fileName = fileToUpload.name || `cropped_photo_${Date.now()}.jpg`;
                    const fileRef = storageRef.child(`learner_photos/${learnerDocId}/${fieldName}/${Date.now()}_${fileName}`);
                    await fileRef.put(fileToUpload);
                    const downloadURL = await fileRef.getDownloadURL();
                    updatedData[fieldName] = downloadURL;
                    
                    // Update main photo only if the uploaded photo corresponds to the learner's current phase
                    if (fieldName === currentPhaseField) {
                        updatedData.photoUrl = downloadURL; 
                    }
                }
            };

            await uploadPhasePhoto('edit-learner-photo-foundation', 'photoUrl_Foundation');
            await uploadPhasePhoto('edit-learner-photo-intermediate', 'photoUrl_Intermediate');
            await uploadPhasePhoto('edit-learner-photo-senior', 'photoUrl_Senior');
            await uploadPhasePhoto('edit-learner-photo-fet', 'photoUrl_FET');

            // Update the learner's document in the 'sams_registrations' collection
            await db.collection('sams_registrations').doc(learnerDocId).update(updatedData);

            statusMessage.textContent = 'Learner information updated successfully!';
            statusMessage.className = 'status-message-box success';
            statusMessage.style.display = 'block';

            // After a short delay, hide the form and reload the profile detail view
            setTimeout(() => {
                editFormContainer.style.display = 'none';
                profileContent.style.display = 'block';
                showLearnerProfileDetail(learnerDocId, teacherUid); // Reload to show updated info
            }, 2000);

        } catch (error) {
            console.error("Error updating learner info:", error);
            statusMessage.textContent = 'Failed to update information. Please try again.';
            statusMessage.className = 'status-message-box error';
            statusMessage.style.display = 'block';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    };
}

/**
 * Loads and displays the history of behavioral comments for a learner.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} learnerDocId - The Firestore document ID of the learner.
 */
async function loadBehavioralComments(db, learnerDocId) {
    const container = document.getElementById('learner-comments-history');
    container.innerHTML = '<p class="data-status-message">Loading comments...</p>';

    const commentsRef = db.collection('sams_registrations').doc(learnerDocId).collection('behavioral_comments').orderBy('timestamp', 'desc');
    commentsRef.onSnapshot(snapshot => {
        if (snapshot.empty) {
            container.innerHTML = '<p class="info-message">No behavioral comments have been recorded for this learner.</p>';
            return;
        }
        container.innerHTML = snapshot.docs.map(doc => {
            const comment = doc.data();
            const date = comment.timestamp.toDate().toLocaleString();
            return `<div class="comment-item"><p class="comment-text">${comment.commentText}</p><p class="comment-meta">By ${comment.teacherName} on ${date}</p></div>`;
        }).join('');
    }, error => {
        console.error("Error loading comments:", error);
        container.innerHTML = '<p class="data-status-message error">Could not load comments.</p>';
    });
}

/**
 * Saves a new behavioral comment to Firestore.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} learnerDocId - The Firestore document ID of the learner.
 * @param {object} teacherData - The authenticated teacher's data.
 */
async function saveBehavioralComment(db, learnerDocId, teacherData) {
    const commentInput = document.getElementById('new-comment-text');
    const statusMessage = document.getElementById('comment-status-message');
    const commentText = commentInput.value.trim();
    if (!commentText) { alert('Please enter a comment.'); return; }

    try {
        await db.collection('sams_registrations').doc(learnerDocId).collection('behavioral_comments').add({
            commentText, teacherId: teacherData.uid, teacherName: `${teacherData.preferredName} ${teacherData.surname}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        commentInput.value = '';
        statusMessage.textContent = 'Comment saved successfully.';
        statusMessage.className = 'status-message-box success';
        statusMessage.style.display = 'block';
        setTimeout(() => statusMessage.style.display = 'none', 3000);
    } catch (error) {
        console.error("Error saving comment:", error);
        statusMessage.textContent = 'Failed to save comment.';
        statusMessage.className = 'status-message-box error';
        statusMessage.style.display = 'block';
    }
}

/**
 * Displays links to the learner's uploaded documents.
 * @param {object} learnerData - The learner's data object from Firestore.
 */
function displayLearnerDocuments(learnerData) {
    const container = document.getElementById('learner-document-links');
    const docLinks = [
        { key: 'birthCertificateUrl', label: "Birth Certificate" }, { key: 'parentIDUrl', label: 'Parent ID' },
        { key: 'proofOfResidenceUrl', label: 'Proof of Residence' }, { key: 'reportCardUrl', label: 'Previous Report Card' }
    ];
    const linksHTML = docLinks.map(doc => learnerData[doc.key] ? `<li><a href="${learnerData[doc.key]}" target="_blank" rel="noopener noreferrer"><i class="far fa-file-pdf"></i> ${doc.label}</a></li>` : '').join('');
    container.innerHTML = linksHTML || '<p class="info-message">No documents were found for this learner.</p>';
}

window.showLearnerProfileDetail = showLearnerProfileDetail;