// sams-data-loaders.js

// Assumes 'db' and 'showSamsDetails' are available globally.

// =========================================================
// === SA-SAMS MANAGEMENT FUNCTIONS (ACCEPTED APPLICATIONS) ===
// =========================================================

async function loadSamsRegistrations() {
    const tableBody = document.querySelector('#sams-data-table tbody');
    const statusMessage = document.getElementById('sams-data-status');
    
    tableBody.innerHTML = '';
    statusMessage.style.display = 'block'; // Ensure status is visible
    statusMessage.textContent = 'Fetching accepted applications...';
    
    const uniqueApplications = new Set();
    let applicationCount = 0;

    try {
        const snapshot = await db.collection('sams_registrations').get();

        if (snapshot.empty) {
            statusMessage.textContent = 'No accepted applications found yet.';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            // **CRITICAL FIX**: If an admissionId is missing or has already been rendered,
            // skip this document entirely to prevent duplicates in the UI.
            if (!admissionId || uniqueApplications.has(admissionId)) {
                return;
            }
            uniqueApplications.add(admissionId); // Mark this admissionId as seen.

            const row = tableBody.insertRow();
            
            let importedDate = 'N/A';
            if (data.importedAt && typeof data.importedAt.toDate === 'function') {
                importedDate = data.importedAt.toDate().toLocaleDateString();
            } else if (data.importedAt) {
                importedDate = new Date(data.importedAt).toLocaleDateString();
            }

            row.insertCell().textContent = admissionId;
            row.insertCell().textContent = formatLearnerName(data);
            row.insertCell().textContent = data.fullGradeSection || data.grade; 
            row.insertCell().textContent = data.parent1Email;
            row.insertCell().textContent = importedDate;
            
            const actionCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Details';
            viewButton.className = 'cta-button-small'; 
            
            viewButton.onclick = () => showSamsDetails(data, 'sams-learners');

            // **FIX**: Add a "Create User Account" button if one doesn't exist.
            if (data.userAccountCreated) {
                const statusSpan = document.createElement('span');
                statusSpan.textContent = 'Account Created';
                statusSpan.className = 'status-badge success';
                actionCell.appendChild(statusSpan);
            } else {
                const createAccountBtn = document.createElement('button');
                createAccountBtn.textContent = 'Create User Account';
                createAccountBtn.className = 'cta-button-small primary-blue';
                createAccountBtn.onclick = () => createUserAccount(doc.id, data, createAccountBtn);
                actionCell.appendChild(createAccountBtn);
            }

            applicationCount++;
        });

        statusMessage.textContent = `Successfully loaded ${applicationCount} accepted application(s).`;
        
    } catch (error) {
        console.error("Error loading SA-SAMS data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}

/**
 * Creates a Firebase Authentication user for a learner and links the UID.
 * @param {string} regId - The Firestore document ID from sams_registrations.
 * @param {object} learnerData - The data object for the learner.
 * @param {HTMLElement} button - The button that was clicked.
 */
async function createUserAccount(regId, learnerData, button) {
    const email = learnerData.parent1Email;
    const learnerName = `${learnerData.learnerName} ${learnerData.learnerSurname}`;
    // A simple, temporary password. The user should be forced to change it on first login.
    const tempPassword = `Password@${learnerData.admissionId}`;

    if (!confirm(`This will create a user account for ${learnerName} with email ${email} and a temporary password. Proceed?`)) {
        return;
    }

    button.disabled = true;
    button.textContent = 'Creating...';

    try {
        // Create the user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, tempPassword);

        // After creating the user, update the corresponding sams_registrations document
        // with the new UID. This is crucial for linking the auth user to their data.
        await db.collection('sams_registrations').doc(regId).update({
            userAccountCreated: true,
            uid: userCredential.user.uid // **FIX**: Save the auth UID to the registration document.
        });

        // Also, create a document in the 'users' collection for role management
        await db.collection('users').doc(userCredential.user.uid).set({
            email: email,
            role: 'learner',
            name: learnerName, // Store basic info for quick access
            samsRegistrationId: regId // Link back to the SAMS registration
        });

        alert(`User account created successfully for ${learnerName}.`);
        button.textContent = 'Account Created';
        button.className = 'status-badge success'; // Change appearance to show success

    } catch (error) {
        console.error("Error creating user account:", error);
        alert(`Failed to create user account: ${error.message}`);
        button.disabled = false;
        button.textContent = 'Create User Account';
    }
}