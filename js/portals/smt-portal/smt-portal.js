// js/portals/smt-portal/smt-portal.js

import { displayOfficialSchoolCalendar } from '../parents-portal/calendar-display.js';

// NOTE: This script relies on the global 'db' variable from firebase-config.js
// All JavaScript specific to the SMT portal will go here.

document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    let db;

    if (userData) {
        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();

        // Load the SMT member's profile
        loadSmtProfile(db, userData);

        // Set up profile editing and picture upload functionality
        setupSmtProfileEditing(db, userData);
        setupSmtProfilePictureUpload(db, userData);

        // Set up UI interactions
        setupResponsiveSidebar();
        setupPortalNavigation(db);

        // Set up Portfolio Management
        setupPortfolioManager(db, userData);

        // Set up Portfolio Print functionality
        setupPortfolioPrint(userData);

        // Set up QMS Module
        setupQmsModule(db, userData); // This will now initialize the new QMS appraisal system

    } else {
        console.error("User data not found in session storage. Redirecting to login.");
        // The auth.js script will handle the redirect if the session is invalid.
    }
});

/**
 * Fetches and displays the SMT member's profile data from Firestore.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} userData - The user data from session storage.
 */
async function loadSmtProfile(db, userData) {
    const smtNameDisplay = document.getElementById('smt-name-display');
    const profilePic = document.getElementById('smt-profile-pic');
    const profileSurname = document.querySelector('.profile-surname');
    const profilePreferredName = document.querySelector('.profile-preferred-name');
    const profileEmail = document.querySelector('.profile-email');
    const profileContact = document.querySelector('.profile-contact');
    const profileSmtRole = document.querySelector('.profile-smt-role');
    const dhProfileDetails = document.getElementById('dh-profile-details');

    try {
        const userDoc = await db.collection('users').doc(userData.uid).get();

        if (userDoc.exists) {
            const smtData = userDoc.data();

            if (smtNameDisplay) smtNameDisplay.textContent = smtData.preferredName || 'SMT Member';
            if (profilePic) profilePic.src = smtData.photoUrl || '../../images/placeholder-profile.png';

            if (profileSurname) profileSurname.innerHTML = `<strong>Surname:</strong> ${smtData.surname || 'N/A'}`;
            if (profilePreferredName) profilePreferredName.innerHTML = `<strong>Preferred Name:</strong> ${smtData.preferredName || 'N/A'}`;
            if (profileEmail) profileEmail.innerHTML = `<strong>Email:</strong> ${smtData.email || 'N/A'}`;
            if (profileContact) profileContact.innerHTML = `<strong>Contact:</strong> ${smtData.contactNumber || 'N/A'}`;
            if (profileSmtRole) profileSmtRole.innerHTML = `<strong>Role:</strong> ${smtData.smtRole || 'N/A'}`;

            // Display DH-specific details if they exist
            if (smtData.smtRole === 'dh' && dhProfileDetails) {
                let dhDetailsHTML = `<p><strong>Department(s):</strong> ${smtData.dhDepartments?.join(', ') || 'N/A'}</p>`;
                dhDetailsHTML += `<p><strong>Responsible Grade(s):</strong> ${smtData.dhGrades?.join(', ') || 'N/A'}</p>`;
                dhProfileDetails.innerHTML = dhDetailsHTML;
                dhProfileDetails.style.display = 'block';
            } else if (dhProfileDetails) {
                dhProfileDetails.style.display = 'none';
            }


        } else {
            console.error("Could not find SMT profile data in Firestore.");
        }
    } catch (error) {
        console.error("Error loading SMT profile:", error);
        if (smtNameDisplay) smtNameDisplay.textContent = 'Error';
    }
}

/**
 * Sets up the event listeners and logic for editing the SMT member's profile.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} smtAuthData - The authenticated SMT member's data from session storage.
 */
function setupSmtProfileEditing(db, smtAuthData) {
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-profile-btn');
    const profileCard = document.querySelector('#profile .profile-card');
    const editFormContainer = document.getElementById('edit-profile-form-container');
    const editForm = document.getElementById('edit-profile-form');

    if (!editBtn || !cancelBtn || !profileCard || !editFormContainer || !editForm) return;

    // Show the edit form
    editBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const userDoc = await db.collection('users').doc(smtAuthData.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            document.getElementById('edit-profile-preferred-name').value = data.preferredName || '';
            document.getElementById('edit-profile-surname').value = data.surname || '';
            document.getElementById('edit-profile-contact').value = data.contactNumber || '';

            profileCard.style.display = 'none';
            editFormContainer.style.display = 'block';
        } else {
            alert('Could not load your profile data to edit.');
        }
    });

    // Hide the edit form
    cancelBtn.addEventListener('click', () => {
        profileCard.style.display = 'flex';
        editFormContainer.style.display = 'none';
    });

    // Handle form submission
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusMessage = document.getElementById('edit-profile-status');
        const submitButton = editForm.querySelector('button[type="submit"]');

        const updatedData = {
            preferredName: document.getElementById('edit-profile-preferred-name').value.trim(),
            surname: document.getElementById('edit-profile-surname').value.trim(),
            contactNumber: document.getElementById('edit-profile-contact').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
        statusMessage.style.display = 'none';

        try {
            await db.collection('users').doc(smtAuthData.uid).update(updatedData);
            statusMessage.textContent = 'Profile updated successfully!';
            statusMessage.className = 'status-message-box success';
            statusMessage.style.display = 'block';

            loadSmtProfile(db, smtAuthData);
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
 * Sets up the responsive sidebar toggle for mobile view.
 */
function setupResponsiveSidebar() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const contentWrapper = document.querySelector('.portal-content-wrapper');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('is-open');
            if (contentWrapper) {
                contentWrapper.classList.toggle('overlay-active');
            }
        });
    }

    if (contentWrapper) {
        contentWrapper.addEventListener('click', () => {
            if (sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
                contentWrapper.classList.remove('overlay-active');
            }
        });
    }
}

/**
 * Sets up the navigation logic for sidebar and other in-page links.
 */
function setupPortalNavigation(db) {
    const navLinks = document.querySelectorAll('.sidebar a[href^="#"], a.block[href^="#"]');
    const sections = document.querySelectorAll('.portal-section');
    const sidebarLinks = document.querySelectorAll('.sidebar a[href^="#"]');

    function showSection(targetId) {
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active-section');
            targetSection.classList.remove('hidden-section');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);

            sidebarLinks.forEach(l => l.classList.remove('active'));
            const correspondingSidebarLink = document.querySelector(`.sidebar a[href="#${targetId}"]`);
            if (correspondingSidebarLink) {
                correspondingSidebarLink.classList.add('active');
            }

            showSection(targetId);
            history.pushState(null, null, `#${targetId}`);

            // Initialize calendar when navigating to its section
            if (targetId === 'school-calendar') {
                displayOfficialSchoolCalendar(db, 'smt-official-calendar-container');
            }
        });
    });

    const initialHash = window.location.hash.substring(1) || 'dashboard';
    showSection(initialHash);
    const initialLink = document.querySelector(`.sidebar a[href="#${initialHash}"]`);
    if (initialLink) initialLink.classList.add('active');

    // Initialize calendar if the page loads on its hash
    if (initialHash === 'school-calendar') {
        displayOfficialSchoolCalendar(db, 'smt-official-calendar-container');
    }
}

// =========================================================
// === SMT PORTFOLIO MANAGEMENT ===
// =========================================================

/**
 * Sets up the main portfolio view and navigation.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} smtAuthData - The authenticated SMT member's data.
 */
function setupPortfolioManager(db, smtAuthData) {
    showPortfolioListView(); // Show the main list view by default

    document.getElementById('back-to-portfolio-list').addEventListener('click', showPortfolioListView);
}

/**
 * Shows the main portfolio view with a link to the general portfolio.
 */
function showPortfolioListView() {
    document.getElementById('portfolio-list-view').style.display = 'block';
    document.getElementById('portfolio-detail-view').style.display = 'none';

    const linksContainer = document.getElementById('portfolio-links-container');
    linksContainer.innerHTML = ''; // Clear previous links

    const link = document.createElement('a');
    link.href = '#';
    link.className = 'portfolio-subject-link'; // Reusing teacher's portal style
    link.innerHTML = `<i class="fas fa-folder-open"></i> Open General Management Portfolio`;
    link.onclick = (e) => {
        e.preventDefault();
        // For SMT, we use a generic "General" portfolio type
        openPortfolioDetailView("General", "Management");
    };
    linksContainer.appendChild(link);
}

/**
 * Opens the detailed view for managing the portfolio.
 * @param {string} subject - The portfolio subject (e.g., "General").
 * @param {string} type - The portfolio type (e.g., "Management").
 */
function openPortfolioDetailView(subject, type) {
    document.getElementById('portfolio-list-view').style.display = 'none';
    document.getElementById('portfolio-detail-view').style.display = 'block';

    document.getElementById('portfolio-detail-header').textContent = `Managing ${subject} ${type} Portfolio`;

    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    const db = firebase.firestore();

    loadPortfolioItems(db, userData, subject, type);
    setupPortfolioUploadForm(db, userData, subject, type);
    setupPortfolioLinkGenerator(userData, subject, type);
}

/**
 * Loads and displays portfolio items.
 * @param {firebase.firestore.Firestore} db
 * @param {object} smtAuthData
 * @param {string} subject
 * @param {string} type
 */
async function loadPortfolioItems(db, smtAuthData, subject, type) {
    const container = document.getElementById('portfolio-items-container');
    container.innerHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><p class="info-message">Loading portfolio items...</p>';

    try {
        const snapshot = await db.collection('smt_portfolios')
            .where('teacherId', '==', smtAuthData.uid) // Re-using 'teacherId' field for consistency
            .where('subject', '==', subject)
            .where('type', '==', type)
            .orderBy('uploadedAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><p class="info-message">This portfolio is empty. Use the form to add your first item.</p>';
            return;
        }

        let itemsHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><ul class="resource-list">';
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            itemsHTML += `
                <li data-doc-id="${item.id}" data-storage-path="${item.storagePath}">
                    <i class="far fa-file-alt"></i>
                    <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="Uploaded: ${item.uploadedAt.toDate().toLocaleDateString()}">${item.description} (${item.category})</a>
                    <button class="cta-button-small danger" onclick="deletePortfolioItem(this, '${subject}', '${type}')"><i class="fas fa-trash-alt"></i></button>
                </li>`;
        });
        itemsHTML += '</ul>';
        container.innerHTML = itemsHTML;

    } catch (error) {
        console.error("Error loading portfolio items:", error);
        container.innerHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><p class="error-message">Could not load portfolio items.</p>';
    }
}

/**
 * Sets up the portfolio upload form listener.
 * @param {firebase.firestore.Firestore} db
 * @param {object} smtAuthData
 * @param {string} subject
 * @param {string} type
 */
function setupPortfolioUploadForm(db, smtAuthData, subject, type) {
    const form = document.getElementById('upload-portfolio-item-form');
    const formSubmitHandler = async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const statusMessage = document.getElementById('portfolio-upload-status');
        const category = document.getElementById('portfolio-item-category').value;
        const description = document.getElementById('portfolio-item-description').value;
        const file = document.getElementById('portfolio-item-file').files[0];

        if (!category || !description || !file) {
            alert('Please fill out all fields and select a file.');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Uploading...';
        statusMessage.style.display = 'block';

        try {
            const storageRef = firebase.storage().ref();
            const filePath = `smt_portfolios/${smtAuthData.uid}/${subject}/${Date.now()}_${file.name}`;
            const fileRef = storageRef.child(filePath);
            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            await db.collection('smt_portfolios').add({
                teacherId: smtAuthData.uid, // Re-using 'teacherId'
                category, subject, type, description,
                fileName: file.name, url: downloadURL, storagePath: filePath,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMessage.textContent = 'Item uploaded successfully!';
            statusMessage.className = 'status-message-box success';
            form.reset();
            loadPortfolioItems(db, smtAuthData, subject, type);

        } catch (error) {
            console.error("Error uploading portfolio item:", error);
            statusMessage.textContent = 'Upload failed. Please try again.';
            statusMessage.className = 'status-message-box error';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload to Portfolio';
        }
    };

    form.removeEventListener('submit', form.lastSubmitHandler);
    form.addEventListener('submit', formSubmitHandler);
    form.lastSubmitHandler = formSubmitHandler;
}

/**
 * Sets up the shareable link generator.
 * @param {object} smtAuthData
 * @param {string} subject
 * @param {string} type
 */
function setupPortfolioLinkGenerator(smtAuthData, subject, type) {
    const generateBtn = document.getElementById('generate-share-link-btn');
    generateBtn.onclick = () => {
        const outputArea = document.getElementById('portfolio-link-output-area');
        const linkInput = document.getElementById('generated-portfolio-link');
        const copyBtn = document.getElementById('copy-portfolio-link-btn');
        const viewerPath = `../portfolio/portfolio-viewer.html?teacherId=${smtAuthData.uid}&subject=${encodeURIComponent(subject)}&type=${encodeURIComponent(type)}`;
        const fullUrl = new URL(viewerPath, window.location.href).href;
        linkInput.value = fullUrl;
        outputArea.style.display = 'block';
        copyBtn.onclick = () => {
            linkInput.select();
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
        };
    };
}

window.deletePortfolioItem = async (button, subject, type) => {
    const listItem = button.closest('li');
    const docId = listItem.dataset.docId;
    if (!confirm('Are you sure you want to permanently delete this item?')) return;
    try {
        await firebase.firestore().collection('smt_portfolios').doc(docId).delete();
        await firebase.storage().ref(listItem.dataset.storagePath).delete();
        listItem.remove();
    } catch (error) {
        console.error("Error deleting item:", error);
        alert('Failed to delete item.');
    }
};

/**
 * Sets up the "Print Portfolio" button functionality.
 * @param {object} smtAuthData - The authenticated SMT member's data.
 */
function setupPortfolioPrint(smtAuthData) {
    const printBtn = document.getElementById('print-portfolio-btn');
    if (!printBtn) return;

    printBtn.addEventListener('click', () => {
        // 1. Populate the cover page with dynamic data
        const smtNameEl = document.getElementById('print-cover-smt-name');
        const dateEl = document.getElementById('print-cover-date');
        
        if (smtNameEl) {
            smtNameEl.textContent = `${smtAuthData.preferredName || ''} ${smtAuthData.surname || ''}`;
        }
        if (dateEl) {
            dateEl.textContent = `Generated on: ${new Date().toLocaleDateString()}`;
        }
        window.print();
    });
}

// =========================================================
// === QMS - TEACHER EVALUATION MODULE ===
// =========================================================

/**
 * Initializes the QMS section.
 */
function setupQmsModule(db, smtAuthData) {
    initQmsAppraisalSystem(db, smtAuthData);
}
/**
 * Sets up the event listener for SMT profile picture uploads.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} smtAuthData - The authenticated SMT member's data from session storage.
 */
function setupSmtProfilePictureUpload(db, smtAuthData) {
    const fileInput = document.getElementById('profile-pic-upload');
    const statusIndicator = document.getElementById('profile-pic-upload-status');
    const profilePic = document.getElementById('smt-profile-pic');

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
            const filePath = `profile_pictures/${smtAuthData.uid}/profile.jpg`;
            const fileRef = storageRef.child(filePath);

            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            await db.collection('users').doc(smtAuthData.uid).update({ photoUrl: downloadURL });

            profilePic.src = downloadURL;
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

// --- QMS Structure Data (used to build the form) ---
const QMS_STANDARDS = [
    {
        id: 'PS1', title: '1. Creation of a Positive Learning and Teaching Environment', maxPoints: 12,
        criteria: [
            { id: 'C1', title: 'Learning and Teaching Environment', descriptors: ['a. Seating arrangement promotes effective teaching and learning', 'b. Classroom is tidy and clean', 'c. Teaching and learning support material (e.g., charts) are displayed and used.'] },
            { id: 'C2', title: 'Classroom Management', descriptors: ['a. Is punctual and organized in class', 'b. Ensures that learners are punctual and settle down quickly', 'c. Communication reflects mutual respect', 'd. Manages discipline effectively'] }
        ]
    },
    {
        id: 'PS2', title: '2. Curriculum Knowledge, Lesson Planning and Presentation', maxPoints: 16,
        criteria: [
            { id: 'C1', title: 'Knowledge of Subject', descriptors: ['a. Has adequate subject knowledge and uses it effectively', 'b. Sets appropriate tasks for learners', 'c. Uses a variety of examples/LTSM to facilitate learning'] },
            { id: 'C2', title: 'Planning and Presentation', descriptors: ['a. Lesson is logical, coherent and meaningful', 'b. Lesson is built on past knowledge of learners', 'c. Time is well-managed during lesson presentation', 'd. Encourages interactive learning (discussions, questions)', 'e. Responds appropriately to learner questions and inputs'] },
            { id: 'C3', title: 'Management of Work Schedule', descriptors: ['a. Pace of the work is in line with time frames (CAPS)'] }
        ]
    },
    {
        id: 'PS3', title: '3. Learner Assessment and Achievement', maxPoints: 10,
        criteria: [
            { id: 'C1', title: 'Feedback to Learners', descriptors: ['a. Assessment tasks are marked and returned timeously', 'b. Feedback is meaningful and regular', 'c. Feedback is incorporated in future lesson planning'] },
            { id: 'C2', title: 'Knowledge and Application of Forms of Assessment', descriptors: ['a. Uses different forms of assessment in line with CAPS', 'b. Intervention strategies accommodate learners with various abilities'] }
        ]
    },
    {
        id: 'PS4', title: '4. Professional Development', maxPoints: 11,
        criteria: [
            { id: 'C1', title: 'Participation in Continuous Professional Development', descriptors: ['a. Engages in on-going self-reflection and sets clear targets', 'b. Attends and participates in activities to enhance skills', 'c. Engages in research/mentoring colleagues'] },
            { id: 'C2', title: 'Educator Professionalism', descriptors: ['a. Comes to school regularly and on time', 'b. Is always neatly dressed and presentable', 'c. Conducts lessons as expected (time-table)', 'd. Adheres to deadlines (e.g., marking, reports)'] }
        ]
    },
    {
        id: 'PS5', title: '5. Extra-Mural and Co-Curricular Participation', maxPoints: 3,
        criteria: [
            { id: 'C1', title: 'Participation in Extra-Mural and Co-curricular Activities', descriptors: ['a. Is involved in extra-mural and co-curricular activities'] }
        ]
    }
];
const TOTAL_MAX_SCORE = QMS_STANDARDS.reduce((sum, ps) => sum + ps.maxPoints, 0); // 52

let appraisalData = {
    info: {},
    ratings: {},
    comments: {}
};

let qmsUserId = null; // Use a distinct variable for QMS user ID
let qmsDb = null; // Use a distinct variable for QMS db instance

/**
 * Initializes the QMS appraisal system.
 * @param {firebase.firestore.Firestore} dbInstance - The Firestore database instance from the main portal.
 * @param {object} smtAuthData - The authenticated SMT member's data.
 */
function initQmsAppraisalSystem(dbInstance, smtAuthData) {
    qmsDb = dbInstance;
    qmsUserId = smtAuthData.uid;

    document.getElementById('user-info').textContent = `User ID: ${qmsUserId} | Status: Ready (Data is saved automatically)`;
    document.getElementById('save-button').disabled = false;

    listenForAppraisalData();
    renderPerformanceStandards(); // Initial render of the form structure
    hideLoadingIndicator();
    document.getElementById('qms-app-container').classList.remove('opacity-0');
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
}

/**
 * Returns the Firestore document reference for the current user's appraisal.
 */
function getAppraisalDocRef() {
    if (!qmsUserId) {
        console.error("QMS User ID is not set. Cannot get document reference.");
        return null;
    }
    // Using firebaseConfig.projectId as appId for consistency
    const appraisalCollectionPath = `/artifacts/${firebaseConfig.projectId}/users/${qmsUserId}/educator_appraisals`;
    return qmsDb.collection(appraisalCollectionPath).doc('current_appraisal');
}

/**
 * Saves the current appraisal data to Firestore.
 * @param {boolean} updateStatus - Whether to update the UI status message.
 */
async function saveAppraisal(updateStatus = true) {
    if (!qmsUserId || !qmsDb) return;

    const docRef = getAppraisalDocRef();
    if (!docRef) return;

    try {
        const dataToSave = {
            info: appraisalData.info || {},
            ratings: appraisalData.ratings || {},
            comments: appraisalData.comments || {},
            timestamp: new Date().toISOString()
        };

        await docRef.set(dataToSave, { merge: true });
        if (updateStatus) {
            const statusEl = document.getElementById('save-status');
            statusEl.textContent = `Data saved successfully at ${new Date().toLocaleTimeString()}.`;
            statusEl.classList.remove('text-red-500');
            statusEl.classList.add('text-green-600');
            setTimeout(() => statusEl.textContent = '', 3000);
        }
    } catch (error) {
        console.error("Error saving appraisal data:", error);
        const statusEl = document.getElementById('save-status');
        statusEl.textContent = `Error saving data! Check console.`;
        statusEl.classList.remove('text-green-600');
        statusEl.classList.add('text-red-500');
    }
}

/**
 * Listens for real-time updates to the appraisal data from Firestore.
 */
function listenForAppraisalData() {
    const docRef = getAppraisalDocRef();
    if (!docRef) return;

    docRef.onSnapshot((docSnap) => {
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log("Real-time QMS data received:", data);
            appraisalData = {
                info: data.info || {},
                ratings: data.ratings || {},
                comments: data.comments || {}
            };
            renderAppraisalData();
        } else {
            console.log("No existing QMS appraisal data found. Starting fresh.");
        }
    }, (error) => {
        console.error("Error listening to QMS document:", error);
    });
}

/**
 * Renders the performance standards section of the QMS form.
 */
function renderPerformanceStandards() {
    const container = document.getElementById('performance-standards');
    if (!container) return; // Ensure container exists
    container.innerHTML = ''; // Clear previous content

    QMS_STANDARDS.forEach(ps => {
        const psElement = document.createElement('div');
        psElement.className = 'border border-gray-200 p-4 rounded-lg bg-gray-50';
        
        let html = `<h3 class="text-xl font-bold text-gray-800 mb-3">${ps.title} <span class="text-sm font-normal text-gray-500"> (Max: ${ps.maxPoints})</span></h3>`;
        
        ps.criteria.forEach((criterion, cIndex) => {
            html += `<div class="mb-3 pl-2 border-l-2 border-indigo-300">`;
            html += `<p class="font-semibold text-gray-700">${criterion.title}</p>`;
            
            criterion.descriptors.forEach((descriptor, dIndex) => {
                const descriptorKey = `${ps.id}_C${cIndex + 1}_D${dIndex + 1}`;
                const currentValue = appraisalData.ratings[descriptorKey] || 0;

                html += `<div class="flex items-center justify-between py-1 text-sm">
                            <span class="w-3/4 text-gray-600">${descriptor}</span>
                            <select id="rating-${descriptorKey}" data-key="${descriptorKey}" onchange="saveRating(this)" class="w-1/4 rating-select p-2 border border-gray-300 rounded-lg bg-white shadow-sm font-medium text-center">
                                <option value="0" ${currentValue == 0 ? 'selected' : ''}>--</option>
                                <option value="1" ${currentValue == 1 ? 'selected' : ''}>1 - Unacceptable</option>
                                <option value="2" ${currentValue == 2 ? 'selected' : ''}>2 - Acceptable</option>
                                <option value="3" ${currentValue == 3 ? 'selected' : ''}>3 - Good</option>
                                <option value="4" ${currentValue == 4 ? 'selected' : ''}>4 - Outstanding</option>
                            </select>
                        </div>`;
            });
            html += `</div>`;
        });
        psElement.innerHTML = html;
        container.appendChild(psElement);
    });
    updateTotalScore();
}

/**
 * Renders the appraisal data into the form fields.
 */
function renderAppraisalData() {
    // Render Info Section
    document.getElementById('appraisee-name').value = appraisalData.info.name || '';
    document.getElementById('appraisee-designation').value = appraisalData.info.designation || '';
    document.getElementById('appraisee-subjects').value = appraisalData.info.subjects || '';
    document.getElementById('school-name').value = appraisalData.info.schoolName || '';
    document.getElementById('principal-name').value = appraisalData.info.principalName || '';
    
    // Render Comments Section
    document.getElementById('comments-midyear').value = appraisalData.comments.midYear || '';
    document.getElementById('comments-annual').value = appraisalData.comments.annual || '';

    // Render Ratings Section (by setting values on existing elements)
    Object.keys(appraisalData.ratings).forEach(key => {
        const selectElement = document.getElementById(`rating-${key}`);
        if (selectElement) {
            selectElement.value = appraisalData.ratings[key];
        }
    });

    updateTotalScore(); // Update score after rendering all data
}

/**
 * Calculates and updates the total score display.
 */
function updateTotalScore() {
    let totalScore = 0;
    Object.values(appraisalData.ratings).forEach(score => {
        totalScore += parseInt(score) || 0;
    });
    document.getElementById('total-score-value').textContent = totalScore;
    document.getElementById('total-score-value').nextElementSibling.textContent = `/ ${TOTAL_MAX_SCORE} (Max)`;
}

// --- INPUT HANDLERS (Exposed globally for HTML event handlers) ---

window.saveInfo = function(key, value) {
    appraisalData.info[key] = value;
    saveAppraisal(false); // Save silently on input change
}

window.saveComments = function(key, value) {
    appraisalData.comments[key] = value;
    saveAppraisal(false); // Save silently on input change
}

window.saveRating = function(selectElement) {
    const key = selectElement.getAttribute('data-key');
    const value = parseInt(selectElement.value);

    appraisalData.ratings[key] = value;
    updateTotalScore();
    saveAppraisal(false); // Save silently on rating change
}

window.saveAppraisal = saveAppraisal; // Expose the main save function

/**
 * Sets up the modal for viewing the profile picture.
 * @param {string} profilePicId - The ID of the profile picture img element.
 */
function setupImageViewer(profilePicId) {
    const modal = document.getElementById('image-viewer-modal');
    const profilePic = document.getElementById(profilePicId);
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

// Inside your main portal initialization function...
async function initializeTeacherPortal(db, userData) {
    // ... your existing code to load profile, etc. ...

    // --- Setup Image Viewer ---
    setupImageViewer('teacher-profile-pic'); // Use the teacher's profile pic ID
}
