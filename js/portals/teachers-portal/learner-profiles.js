// js/portals/teachers-portal/learner-profiles.js

/**
 * Sets up the initial state and event listeners for the Learner Profiles section.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's data.
 */
export function setupLearnerProfileSection(db, teacherData) {
    const classFilter = document.getElementById('profile-class-filter');
    const backButton = document.getElementById('back-to-learner-profile-list');

    document.getElementById('learner-profile-list-view').style.display = 'block';
    document.getElementById('learner-profile-detail-view').style.display = 'none';

    classFilter.addEventListener('change', (e) => {
        const selectedClass = e.target.value;
        if (selectedClass) {
            loadLearnersForProfileList(db, selectedClass, teacherData);
        } else {
            document.getElementById('learner-profile-list-container').innerHTML = '';
            document.getElementById('learner-profile-list-status').textContent = 'Please select a class to load learners.';
        }
    });

    backButton.addEventListener('click', () => {
        document.getElementById('learner-profile-list-view').style.display = 'block';
        document.getElementById('learner-profile-detail-view').style.display = 'none';
    });
}

/**
 * Loads and displays a list of learners for the selected class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} className - The class to load learners for.
 * @param {object} teacherData - The authenticated teacher's data.
 */
async function loadLearnersForProfileList(db, className, teacherData) {
    const container = document.getElementById('learner-profile-list-container');
    const status = document.getElementById('learner-profile-list-status');
    status.textContent = `Loading learners for class ${className}...`;
    container.innerHTML = '';

    try {
        const snapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', className).get();
        if (snapshot.empty) {
            status.textContent = `No learners found in class ${className}.`;
            return;
        }

        const learners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        sortLearnersByName(learners);

        let listHTML = '<ul class="resource-list">';
        learners.forEach(learner => {
            listHTML += `
                <li>
                    <i class="fas fa-user-graduate"></i>
                    <div>
                        <h3>${formatLearnerName(learner)}</h3>
                        <p>Admission No: ${learner.admissionId}</p>
                    </div>
                    <button class="cta-button-small" onclick="showLearnerProfileDetail('${learner.id}', '${teacherData.uid}')">View Profile</button>
                </li>`;
        });
        listHTML += '</ul>';
        container.innerHTML = listHTML;
        status.textContent = `Displaying ${learners.length} learner(s) for class ${className}.`;
    } catch (error) {
        console.error("Error loading learners for profile list:", error);
        status.textContent = 'An error occurred while loading learners.';
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

        contentContainer.innerHTML = `
            <div class="profile-header" style="position: relative;">
                <img src="${learnerData.photoUrl || '../../images/placeholder-profile.png'}" alt="Learner Photo" class="profile-pic-large">
                <div class="profile-header-info">
                    <button id="edit-learner-btn" class="cta-button-edit" style="position: absolute; top: 15px; right: 15px;"><i class="fas fa-user-edit"></i> Edit Info</button>
                    <h2>${formatLearnerName(learnerData)}</h2>
                    <p><strong>Admission No:</strong> ${learnerData.admissionId}</p>
                    <p><strong>Class:</strong> ${learnerData.fullGradeSection}</p>
                </div>
            </div>
            <div class="profile-details-grid">
                <div class="profile-detail-card"><h4>Learner Details</h4>
                    <p><strong>Other Name(s):</strong> ${learnerData.learnerOthername || 'N/A'}</p>
                    <p><strong>ID/Birth Cert No:</strong> ${learnerData.learnerID || 'N/A'}</p>
                    <p><strong>Date of Birth:</strong> ${learnerData.learnerDOB ? new Date(learnerData.learnerDOB).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Gender:</strong> ${learnerData.learnerGender || 'N/A'}</p>
                    <p><strong>Nationality:</strong> ${learnerData.learnerNationality || 'N/A'}</p>
                    <p><strong>Race:</strong> ${learnerData.learnerRace || 'N/A'}</p>
                    <p><strong>Home Language:</strong> ${learnerData.homeLanguage || learnerData.learnerLanguage || 'N/A'}</p>
                    <p><strong>Previous School:</strong> ${learnerData.prevSchool || 'N/A'}</p>
                </div>
                <div class="profile-detail-card"><h4>Parent/Guardian 1</h4>
                    <p><strong>Name:</strong> ${learnerData.parent1Name || 'N/A'}</p>
                    <p><strong>Relationship:</strong> ${learnerData.parent1Relationship || 'N/A'}</p>
                    <p><strong>Contact:</strong> ${learnerData.parent1Contact || 'N/A'}</p>
                    <p><strong>Email:</strong> ${learnerData.parent1Email || 'N/A'}</p>
                    <p><strong>Address:</strong> ${learnerData.parent1Address || 'N/A'}</p>
                </div>
                 <div class="profile-detail-card"><h4>Parent/Guardian 2</h4>
                    <p><strong>Name:</strong> ${learnerData.parent2Name || 'N/A'}</p>
                    <p><strong>Relationship:</strong> ${learnerData.parent2Relationship || 'N/A'}</p>
                    <p><strong>Contact:</strong> ${learnerData.parent2Contact || 'N/A'}</p>
                    <p><strong>Email:</strong> ${learnerData.parent2Email || 'N/A'}</p>
                    <p><strong>Address:</strong> ${learnerData.parent2Address || 'N/A'}</p>
                </div>
            </div>`;

        loadBehavioralComments(db, learnerDocId);
        document.getElementById('add-comment-form').onsubmit = (e) => {
            e.preventDefault();
            saveBehavioralComment(db, learnerDocId, JSON.parse(sessionStorage.getItem('currentUser')));
        };

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

    if (!editBtn || !cancelBtn || !profileContent || !editFormContainer || !editForm) {
        console.error("One or more elements for learner editing are missing from the DOM.");
        return;
    }

    // Show the edit form
    editBtn.addEventListener('click', () => {
        // Populate the form with the learner's current data
        // Learner Details
        document.getElementById('edit-learner-info-name').value = learnerData.learnerName || '';
        document.getElementById('edit-learner-info-othername').value = learnerData.learnerOthername || '';
        document.getElementById('edit-learner-info-surname').value = learnerData.learnerSurname || '';
        document.getElementById('edit-learner-info-id').value = learnerData.learnerID || 'Not Found';
        document.getElementById('edit-learner-info-dob').value = learnerData.learnerDOB ? learnerData.learnerDOB.split('T')[0] : '';
        document.getElementById('edit-learner-info-gender').value = learnerData.learnerGender || 'male';
        document.getElementById('edit-learner-info-nationality').value = learnerData.learnerNationality || '';
        document.getElementById('edit-learner-info-race').value = learnerData.learnerRace || 'african';
        document.getElementById('edit-learner-info-language').value = learnerData.homeLanguage || learnerData.learnerLanguage || '';
        document.getElementById('edit-learner-info-prev-school').value = learnerData.prevSchool || '';

        // Parent 1 Details
        document.getElementById('edit-parent1-name').value = learnerData.parent1Name || '';
        document.getElementById('edit-parent1-contact').value = learnerData.parent1Contact || '';
        document.getElementById('edit-parent1-email').value = learnerData.parent1Email || '';
        document.getElementById('edit-parent1-address').value = learnerData.parent1Address || '';

        // Hide the profile view and show the edit form
        profileContent.style.display = 'none';
        editFormContainer.style.display = 'block';
    });

    // Hide the edit form and show the profile view
    cancelBtn.addEventListener('click', () => {
        profileContent.style.display = 'block';
        editFormContainer.style.display = 'none';
    });

    // Handle form submission to save changes
    editForm.addEventListener('submit', async (e) => {
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
            prevSchool: document.getElementById('edit-learner-info-prev-school').value.trim(),

            // Parent 1 fields
            parent1Name: document.getElementById('edit-parent1-name').value.trim(),
            parent1Contact: document.getElementById('edit-parent1-contact').value.trim(),
            parent1Email: document.getElementById('edit-parent1-email').value.trim(),
            parent1Address: document.getElementById('edit-parent1-address').value.trim(),
            lastUpdatedBy: teacherUid, // **FIXED**: Use the UID passed from sessionStorage.
            lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp() // Timestamp the change
        };

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
        statusMessage.style.display = 'none';

        try {
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
    });
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