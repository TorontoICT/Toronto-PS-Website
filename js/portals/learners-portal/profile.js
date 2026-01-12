/**
 * Initializes the profile section, populating data and setting up editing.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data.
 * @param {object} fullLearnerData - The full learner profile data.
 */
export function initializeProfileSection(db, authData, fullLearnerData) {
    // --- Populate Profile Section ---        
    document.getElementById('learner-profile-pic').src = fullLearnerData.photoUrl || '../../images/placeholder-profile.png';
    document.getElementById('profile-surname').innerHTML = `<strong>Surname:</strong> ${fullLearnerData.learnerSurname || 'N/A'}`;
    document.getElementById('profile-name').innerHTML = `<strong>Name:</strong> ${fullLearnerData.learnerName || 'N/A'}`;
    document.getElementById('profile-email').innerHTML = `<strong>Email:</strong> ${authData.email || 'N/A'}`;
    document.getElementById('profile-admission-no').innerHTML = `<strong>Admission No:</strong> ${fullLearnerData.admissionId || 'N/A'}`;
    document.getElementById('profile-grade').innerHTML = `<strong>Current Grade:</strong> ${fullLearnerData.fullGradeSection || 'N/A'}`;

    // --- Setup Profile Editing ---
    setupLearnerProfileEditing(db, authData, fullLearnerData);
    setupLearnerProfilePictureUpload(db, authData);

    // --- Setup Image Viewer ---
    setupImageViewer();
}

/**
 * Sets up the event listeners and logic for editing the learner's profile.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data from session storage.
 * @param {object} profileData - The full learner profile data from sams_registrations.
 */
function setupLearnerProfileEditing(db, authData, profileData) {
    const editBtn = document.getElementById('edit-learner-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-learner-profile-btn');
    const profileCard = document.querySelector('#profile .profile-card');
    const editFormContainer = document.getElementById('edit-learner-profile-form-container');
    const editForm = document.getElementById('edit-learner-profile-form');

    if (!editBtn || !cancelBtn || !profileCard || !editFormContainer || !editForm) return;

    // Show the edit form
    editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('edit-learner-name').value = profileData.learnerName || '';
        document.getElementById('edit-learner-surname').value = profileData.learnerSurname || '';
        profileCard.style.display = 'none';
        editFormContainer.style.display = 'block';
    });

    // Hide the edit form
    cancelBtn.addEventListener('click', () => {
        profileCard.style.display = 'flex';
        editFormContainer.style.display = 'none';
    });

    // Handle form submission
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusMessage = document.getElementById('edit-learner-profile-status');
        const submitButton = editForm.querySelector('button[type="submit"]');

        const updatedData = {
            learnerName: document.getElementById('edit-learner-name').value.trim(),
            learnerSurname: document.getElementById('edit-learner-surname').value.trim(),
        };

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
        statusMessage.style.display = 'none';

        try {
            // Update both the `users` collection and the `sams_registrations` collection
            const userRef = db.collection('users').doc(authData.uid);
            const samsRef = db.collection('sams_registrations').doc(authData.samsRegistrationId);

            const batch = db.batch();
            batch.update(userRef, updatedData);
            batch.update(samsRef, updatedData);
            await batch.commit();

            // Update session storage to reflect changes immediately
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            const newSessionUser = { ...currentUser, ...updatedData };
            sessionStorage.setItem('currentUser', JSON.stringify(newSessionUser));

            statusMessage.textContent = 'Profile updated successfully!';
            statusMessage.className = 'status-message-box success';
            statusMessage.style.display = 'block';

            // Refresh the profile display and hide the form
            initializeProfileSection(db, newSessionUser, { ...profileData, ...updatedData });
            setTimeout(() => {
                profileCard.style.display = 'flex';
                editFormContainer.style.display = 'none';
                statusMessage.style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error("Error updating profile:", error);
            statusMessage.textContent = 'Failed to update profile. Please try again.';
            statusMessage.className = 'status-message-box error';
            statusMessage.style.display = 'block';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    });
}

/**
 * Sets up the event listener for learner profile picture uploads.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data from session storage.
 */
function setupLearnerProfilePictureUpload(db, authData) {
    const fileInput = document.getElementById('learner-profile-pic-upload');
    const statusIndicator = document.getElementById('learner-profile-pic-upload-status');
    const profilePic = document.getElementById('learner-profile-pic');

    if (!fileInput || !statusIndicator || !profilePic) return;

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (e.g., JPG, PNG).');
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert('File is too large. Please select an image smaller than 2MB.');
            return;
        }

        statusIndicator.style.display = 'flex';
        statusIndicator.innerHTML = '<i class="fas fa-sync fa-spin"></i>';

        try {
            const storage = firebase.storage();
            const storageRef = storage.ref();
            const filePath = `profile_pictures/${authData.uid}/profile.jpg`;
            const fileRef = storageRef.child(filePath);

            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            // Update both user and SAMS records with the new photo URL
            const userRef = db.collection('users').doc(authData.uid);
            const samsRef = db.collection('sams_registrations').doc(authData.samsRegistrationId);
            const batch = db.batch();
            batch.update(userRef, { photoUrl: downloadURL });
            batch.update(samsRef, { photoUrl: downloadURL });
            await batch.commit();

            profilePic.src = downloadURL;
            statusIndicator.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => { statusIndicator.style.display = 'none'; }, 2000);

        } catch (error) {
            console.error("Error uploading profile picture:", error);
            statusIndicator.innerHTML = '<i class="fas fa-times"></i>';
            alert('Failed to upload profile picture. Please try again.');
            setTimeout(() => { statusIndicator.style.display = 'none'; }, 3000);
        } finally {
            e.target.value = ''; // Clear the file input
        }
    });
}

/**
 * Sets up the modal for viewing the profile picture.
 */
function setupImageViewer() {
    const modal = document.getElementById('image-viewer-modal');
    const profilePic = document.getElementById('learner-profile-pic');
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