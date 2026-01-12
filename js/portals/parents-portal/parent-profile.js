// js/portals/parents-portal/parent-profile.js

// NOTE: This script relies on the global 'db' variable from firebase-config.js
// and assumes firebase is initialized.

/**
 * Loads and displays the parent's profile data from Firestore.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} parentAuthData - The authenticated parent's data from session storage.
 */
async function loadParentProfile(db, parentAuthData) {
    const profileNameEl = document.querySelector('#profile .profile-name');
    const profileEmailEl = document.querySelector('#profile .profile-email');
    const profileContactEl = document.querySelector('#profile .profile-contact');
    const profilePicEl = document.getElementById('parent-profile-pic');

    if (!parentAuthData || !parentAuthData.uid) {
        console.error("Parent auth data is missing. Cannot load profile.");
        return;
    }

    try {
        const doc = await db.collection('users').doc(parentAuthData.uid).get();

        if (doc.exists) {
            const parentData = doc.data();
            const parentFullName = `${parentData.name || ''} ${parentData.surname || ''}`.trim();

            if (profileNameEl) profileNameEl.innerHTML = `<strong>Name:</strong> ${parentFullName || 'N/A'}`;
            if (profileEmailEl) profileEmailEl.innerHTML = `<strong>Email:</strong> ${parentData.email || 'N/A'}`;
            if (profileContactEl) profileContactEl.innerHTML = `<strong>Contact:</strong> ${parentData.contactNumber || 'N/A'}`;
            if (profilePicEl) profilePicEl.src = parentData.photoUrl || '../../images/placeholder-profile.png';
        } else {
            console.error("Parent profile document not found in Firestore.");
            if (profileNameEl) profileNameEl.textContent = "Profile not found.";
        }
    } catch (error) {
        console.error("Error loading parent profile:", error);
    }
}

/**
 * Sets up the event listeners and logic for editing the parent's profile contact number.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} parentAuthData - The authenticated parent's data from session storage.
 */
function setupParentProfileEditing(db, parentAuthData) {
    const editBtn = document.getElementById('edit-parent-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-parent-profile-btn');
    const profileCard = document.querySelector('#profile .profile-card');
    const editFormContainer = document.getElementById('edit-parent-profile-form-container');
    const editForm = document.getElementById('edit-parent-profile-form');

    if (!editBtn || !cancelBtn || !profileCard || !editFormContainer || !editForm) return;

    editBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const userDoc = await db.collection('users').doc(parentAuthData.uid).get();
        if (userDoc.exists) {
            document.getElementById('edit-parent-contact').value = userDoc.data().contactNumber || '';
            profileCard.style.display = 'none';
            editFormContainer.style.display = 'block';
        } else {
            alert('Could not load your profile data to edit.');
        }
    });

    cancelBtn.addEventListener('click', () => {
        profileCard.style.display = 'flex';
        editFormContainer.style.display = 'none';
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusMessage = document.getElementById('edit-parent-profile-status');
        const submitButton = editForm.querySelector('button[type="submit"]');
        const updatedContact = document.getElementById('edit-parent-contact').value.trim();

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
        statusMessage.style.display = 'none';

        try {
            await db.collection('users').doc(parentAuthData.uid).update({
                contactNumber: updatedContact,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMessage.textContent = 'Profile updated successfully!';
            statusMessage.className = 'status-message-box success';
            statusMessage.style.display = 'block';

            loadParentProfile(db, parentAuthData); // Refresh the display
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
 * Sets up the event listener for parent profile picture uploads.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} parentAuthData - The authenticated parent's data from session storage.
 */
function setupParentProfilePictureUpload(db, parentAuthData) {
    const fileInput = document.getElementById('parent-profile-pic-upload');
    const statusIndicator = document.getElementById('parent-profile-pic-upload-status');
    const profilePic = document.getElementById('parent-profile-pic');

    if (!fileInput || !statusIndicator || !profilePic) return;

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
        if (file.size > 2 * 1024 * 1024) { alert('File is too large (max 2MB).'); return; }

        statusIndicator.style.display = 'flex';
        statusIndicator.innerHTML = '<i class="fas fa-sync fa-spin"></i>';

        try {
            const storageRef = firebase.storage().ref();
            const filePath = `profile_pictures/${parentAuthData.uid}/profile.jpg`;
            const snapshot = await storageRef.child(filePath).put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            await db.collection('users').doc(parentAuthData.uid).update({ photoUrl: downloadURL });
            profilePic.src = downloadURL;

            statusIndicator.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => { statusIndicator.style.display = 'none'; }, 2000);
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            statusIndicator.innerHTML = '<i class="fas fa-times"></i>';
            alert('Failed to upload profile picture.');
            setTimeout(() => { statusIndicator.style.display = 'none'; }, 3000);
        }
    });
}