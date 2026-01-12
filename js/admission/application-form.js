// This config must match your main project's config
const firebaseConfig = {
    apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
    authDomain: "school-website-66326.firebaseapp.com",
    projectId: "school-website-66326",
    storageBucket: "school-website-66326.firebasestorage.app", // Ensure this is correct
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const storage = firebase.storage();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('application-form');
    if (!form) return;

    form.addEventListener('submit', handleFormSubmit);
});

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const statusMessage = document.getElementById('submission-status');

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Submitting...';
    statusMessage.style.display = 'block';
    statusMessage.className = 'status-message-box info';
    statusMessage.textContent = 'Please wait, uploading documents...';

    try {
        // 1. Upload files to Firebase Storage
        const fileInputs = [
            { id: 'doc-birth-cert', key: 'birthcertificateurl' },
            { id: 'doc-parent-id', key: 'parentidurl' },
            { id: 'doc-proof-residence', key: 'proofofresidenceurl' },
            { id: 'doc-report-card', key: 'reportcardurl' }
        ];

        const uploadPromises = fileInputs.map(async (inputInfo) => {
            const fileInput = document.getElementById(inputInfo.id);
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const learnerSurname = document.getElementById('learner-surname').value.trim() || 'unknown';
                const timestamp = Date.now();
                const storagePath = `admission-documents/${timestamp}_${learnerSurname}/${file.name}`;
                const storageRef = storage.ref(storagePath);

                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();
                return { key: inputInfo.key, url: downloadURL };
            }
            return null; // No file selected for this input
        });

        const uploadedFiles = await Promise.all(uploadPromises);

        // **FIX**: Create hidden input fields for each URL and append them to the form.
        // This ensures the URLs are part of the form data when sent to Google Apps Script.
        uploadedFiles.forEach(fileInfo => {
            if (fileInfo) {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = fileInfo.key; // e.g., 'birthcertificateurl'
                hiddenInput.value = fileInfo.url;
                form.appendChild(hiddenInput);
            }
        });

        // 2. Prepare form data for Google Apps Script
        const formData = new FormData(form);

        // The FormData object now automatically includes the hidden inputs.
        // The old method of appending them is no longer needed.

        statusMessage.textContent = 'Documents uploaded. Submitting application details...';

        // 3. Submit all data to Google Apps Script
        const scriptURL = 'https://script.google.com/macros/s/AKfycbyYCBiHB7oaAchC--LfvJhpAOqOOqVNYtsd90-2g4gHp1LHzkz_7lhrMMvVaD41Pmyr3g/exec';
        const response = await fetch(scriptURL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }

        const resultText = await response.text();

        if (resultText.toLowerCase().includes('success')) {
            statusMessage.className = 'status-message-box success';
            statusMessage.textContent = 'Application submitted successfully! You will receive a confirmation email shortly.';
            form.reset();
        } else {
            throw new Error(resultText || 'An unknown error occurred from the server.');
        }

    } catch (error) {
        console.error('Submission Error:', error);
        statusMessage.className = 'status-message-box error';
        statusMessage.textContent = `An error occurred: ${error.message}. Please try again.`;
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Application';
    }
}