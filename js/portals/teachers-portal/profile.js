// js/portals/teachers-portal/profile.js

/**
 * Fetches and displays the teacher's profile data from Firestore.
 * @param {object} userData - The user data from session storage.
 */
async function loadTeacherProfile(userData) {
    const teacherNameDisplay = document.getElementById('teacher-name-display');
    const profileSurname = document.querySelector('.profile-surname');
    const profilePreferredName = document.querySelector('.profile-preferred-name');
    const profileEmail = document.querySelector('.profile-email');
    const profileContact = document.querySelector('.profile-contact');
    const profileDepartment = document.querySelector('.profile-department');
    const parentClassFilter = document.getElementById('teacher-parent-class-filter');
    const rosterSetupClassSelect = document.getElementById('roster-setup-class-select');
    const profileClassFilter = document.getElementById('profile-class-filter');

    if (!userData) {
        console.error("User data not found in session storage. Please log in again.");
        return;
    }

    try {
        const db = firebase.firestore();
        const doc = await db.collection('users').doc(userData.uid).get();

        if (doc.exists) {
            const teacherData = doc.data();
            const teacherName = teacherData.preferredName || 'Teacher';

            if (teacherNameDisplay) teacherNameDisplay.textContent = teacherName;

            const profilePic = document.getElementById('teacher-profile-pic');
            if (profilePic) profilePic.src = teacherData.photoUrl || '../../images/placeholder-profile.png';

            if (profileSurname) profileSurname.innerHTML = `<strong>Surname:</strong> ${teacherData.surname || 'N/A'}`;
            if (profilePreferredName) profilePreferredName.innerHTML = `<strong>Preferred Name:</strong> ${teacherData.preferredName || 'N/A'}`;
            if (profileEmail) profileEmail.innerHTML = `<strong>Email:</strong> ${teacherData.email || 'N/A'}`;
            if (profileContact) profileContact.innerHTML = `<strong>Contact:</strong> ${teacherData.contactNumber || 'N/A'}`;
            if (profileDepartment) {
                const departments = teacherData.departments;
                if (Array.isArray(departments) && departments.length > 0) {
                    profileDepartment.innerHTML = `<strong>Department(s):</strong> ${departments.join(', ')}`;
                } else {
                    profileDepartment.innerHTML = `<strong>Department(s):</strong> Not Assigned`;
                }
            }

            const assignedClasses = teacherData.teachingAssignments ? [...new Set(teacherData.teachingAssignments.map(a => a.fullClass))].sort() : [];

            // Populate dropdowns that depend on class assignments
            if (parentClassFilter) {
                parentClassFilter.innerHTML = '<option value="">-- Select a Class --</option>';
                assignedClasses.forEach(className => parentClassFilter.add(new Option(className, className)));
            }

            if (rosterSetupClassSelect && teacherData.isClassTeacher && teacherData.responsibleClass) {
                rosterSetupClassSelect.innerHTML = `<option value="">-- Select Your Responsible Class --</option>`;
                rosterSetupClassSelect.add(new Option(teacherData.responsibleClass, teacherData.responsibleClass));
            }

            if (profileClassFilter) {
                profileClassFilter.innerHTML = assignedClasses.length > 0 ? '<option value="">-- Select a Class --</option>' : '<option value="">No classes assigned</option>';
                assignedClasses.forEach(className => profileClassFilter.add(new Option(className, className)));
            }
        }
    } catch (error) {
        console.error("Error loading teacher profile:", error);
    }
}

/**
 * Sets up the event listeners and logic for editing the teacher's profile.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data from session storage.
 */
function setupProfileEditing(db, teacherAuthData) {
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-profile-btn');
    const profileCard = document.querySelector('#profile .profile-card');
    const editFormContainer = document.getElementById('edit-profile-form-container');
    const editForm = document.getElementById('edit-profile-form');

    if (!editBtn || !cancelBtn || !profileCard || !editFormContainer || !editForm) return;

    editBtn.addEventListener('click', async () => {
        const userDoc = await db.collection('users').doc(teacherAuthData.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            document.getElementById('edit-profile-preferred-name').value = data.preferredName || '';
            document.getElementById('edit-profile-surname').value = data.surname || '';
            document.getElementById('edit-profile-contact').value = data.contactNumber || '';

            // Uncheck all department checkboxes first
            document.querySelectorAll('input[name="edit-department"]').forEach(checkbox => checkbox.checked = false);
            // Check the ones that are in the user's data
            if (Array.isArray(data.departments)) {
                data.departments.forEach(dept => {
                    const checkbox = document.querySelector(`input[name="edit-department"][value="${dept}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

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
        const statusMessage = document.getElementById('edit-profile-status');
        const submitButton = editForm.querySelector('button[type="submit"]');

        // Collect values from the checkboxes
        const selectedDepartments = Array.from(document.querySelectorAll('input[name="edit-department"]:checked')).map(cb => cb.value);

        const updatedData = {
            preferredName: document.getElementById('edit-profile-preferred-name').value.trim(),
            surname: document.getElementById('edit-profile-surname').value.trim(),
            contactNumber: document.getElementById('edit-profile-contact').value.trim(),
            departments: selectedDepartments, // Save as an array
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
        statusMessage.style.display = 'none';

        try {
            await db.collection('users').doc(teacherAuthData.uid).update(updatedData);
            statusMessage.textContent = 'Profile updated successfully!';
            statusMessage.className = 'status-message-box success';
            statusMessage.style.display = 'block';
            loadTeacherProfile(teacherAuthData);
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
 * Sets up the event listener for profile picture uploads.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data from session storage.
 */
function setupProfilePictureUpload(db, teacherAuthData) {
    const fileInput = document.getElementById('profile-pic-upload');
    const statusIndicator = document.getElementById('profile-pic-upload-status');
    const profilePic = document.getElementById('teacher-profile-pic');

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
            const storageRef = firebase.storage().ref();
            const filePath = `profile_pictures/${teacherAuthData.uid}/profile.jpg`;
            const fileRef = storageRef.child(filePath);
            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            await db.collection('users').doc(teacherAuthData.uid).update({ photoUrl: downloadURL });

            profilePic.src = downloadURL;
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            currentUser.photoUrl = downloadURL;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

            statusIndicator.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => { statusIndicator.style.display = 'none'; }, 2000);
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            statusIndicator.innerHTML = '<i class="fas fa-times"></i>';
            alert('Failed to upload profile picture. Please try again.');
            setTimeout(() => { statusIndicator.style.display = 'none'; }, 3000);
        }
    });
}

/**
 * Checks if the user is a class teacher and displays specific UI elements.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
async function showClassTeacherSections(db, teacherAuthData) {
    try {
        const userDoc = await db.collection('users').doc(teacherAuthData.uid).get();
        if (userDoc.exists && userDoc.data().isClassTeacher) {
            const classTeacherElements = document.querySelectorAll('.class-teacher-only');
            classTeacherElements.forEach(el => {
                el.style.display = 'block'; // Or 'flex', 'grid', etc., depending on the element
            });
        }
    } catch (error) {
        console.error("Error checking for class teacher status:", error);
    }
}