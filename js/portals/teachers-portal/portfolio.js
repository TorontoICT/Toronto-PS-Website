// js/portals/teachers-portal/portfolio.js

const PORTFOLIO_CATEGORY_ORDER = [
    "Table Of Content", "Job Description", "Mission and Vision", "School Calender",
    "Personal Time Table", "Lesson Plans", "Student Assessments", "Classroom Management",
    "Teaching Philosophy", "Student Work Samples", "Professional Development",
    "Parent Communication", "Other"
];

/**
 * Sets up the portfolio upload form and listeners.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
export function setupPortfolioManager(db, teacherAuthData) {
    showPortfolioListView();
    document.getElementById('back-to-portfolio-list').addEventListener('click', showPortfolioListView);
    setupPortfolioPrint(teacherAuthData);
}

/**
 * Sets up the portfolio upload form for a specific subject/grade context.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 * @param {string} subject - The subject of the portfolio.
 * @param {string} grade - The grade of the portfolio.
 */
function setupPortfolioUploadForm(db, teacherAuthData, subject, grade) {
    const form = document.getElementById('upload-portfolio-item-form');
    if (!form) return;

    const formSubmitHandler = async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const statusMessage = document.getElementById('portfolio-upload-status');

        const category = document.getElementById('portfolio-item-category').value;
        const description = document.getElementById('portfolio-item-description').value;
        const file = document.getElementById('portfolio-item-file').files[0];

        if (!category || !description || !file || !subject || !grade) {
            alert('Please fill out all fields and select a file.');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Uploading...';
        statusMessage.textContent = 'Upload in progress...';
        statusMessage.className = 'status-message-box info';
        statusMessage.style.display = 'block';

        try {
            const storageRef = firebase.storage().ref();
            const filePath = `portfolios/${teacherAuthData.uid}/${grade}/${subject}/${category}/${Date.now()}_${file.name}`;
            const fileRef = storageRef.child(filePath);
            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            await db.collection('teacher_portfolios').add({
                teacherId: teacherAuthData.uid, category, subject, grade, description,
                fileName: file.name, url: downloadURL, storagePath: filePath,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMessage.textContent = 'Item uploaded successfully!';
            statusMessage.className = 'status-message-box success';
            form.reset();
            loadPortfolioItems(db, teacherAuthData, subject, grade);
        } catch (error) {
            console.error("Error uploading portfolio item:", error);
            statusMessage.textContent = 'An error occurred during upload. Please try again.';
            statusMessage.className = 'status-message-box error';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload to Portfolio';
        }
    };

    if (form.lastSubmitHandler) {
        form.removeEventListener('submit', form.lastSubmitHandler);
    }
    form.addEventListener('submit', formSubmitHandler);
    form.lastSubmitHandler = formSubmitHandler;
}

/**
 * Shows the main portfolio view which lists all subject-specific portfolios.
 */
async function showPortfolioListView() {
    document.getElementById('portfolio-subject-list-container').style.display = 'block';
    document.getElementById('portfolio-detail-view').style.display = 'none';

    const linksContainer = document.getElementById('portfolio-subject-links');
    linksContainer.innerHTML = '<p class="info-message">Loading your teaching assignments...</p>';

    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!userData) return;

    const teacherDoc = await firebase.firestore().collection('users').doc(userData.uid).get();
    if (!teacherDoc.exists) {
        linksContainer.innerHTML = '<p class="error-message">Could not find your teacher profile.</p>';
        return;
    }

    const assignments = teacherDoc.data().teachingAssignments || [];
    if (assignments.length === 0) {
        linksContainer.innerHTML = '<p class="info-message">You have no teaching assignments. No portfolios to display.</p>';
        return;
    }

    linksContainer.innerHTML = '';
    assignments.forEach(assignment => {
        const { subject, grade, fullClass } = assignment;
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'portfolio-subject-link';
        link.innerHTML = `<i class="fas fa-folder"></i> Portfolio for <strong>${subject}</strong> - Class ${fullClass}`;
        link.onclick = (e) => {
            e.preventDefault();
            openPortfolioDetailView(subject, grade, fullClass);
        };
        linksContainer.appendChild(link);
    });
}

/**
 * Opens the detailed view for a specific subject portfolio.
 * @param {string} subject - The subject of the portfolio.
 * @param {string} grade - The grade of the portfolio.
 * @param {string} fullClass - The full class name for display.
 */
function openPortfolioDetailView(subject, grade, fullClass) {
    document.getElementById('portfolio-subject-list-container').style.display = 'none';
    document.getElementById('portfolio-detail-view').style.display = 'block';
    document.getElementById('portfolio-detail-header').textContent = `Managing Portfolio for ${subject} - Class ${fullClass}`;

    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    const db = firebase.firestore();

    loadPortfolioItems(db, userData, subject, grade);
    setupPortfolioUploadForm(db, userData, subject, grade);
    setupPortfolioLinkGenerator(userData, subject, grade);
}

/**
 * Loads and displays portfolio items for a specific subject and grade.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 * @param {string} subject - The subject to filter by.
 * @param {string} grade - The grade to filter by.
 */
async function loadPortfolioItems(db, teacherAuthData, subject, grade) {
    const container = document.getElementById('portfolio-items-container');
    if (!container) return;
    container.innerHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><p class="info-message">Loading portfolio items...</p>';

    try {
        const snapshot = await db.collection('teacher_portfolios').where('teacherId', '==', teacherAuthData.uid).where('subject', '==', subject).where('grade', '==', grade).orderBy('uploadedAt', 'desc').get();

        if (snapshot.empty) {
            container.innerHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><p class="info-message">This portfolio is empty. Use the form on the left to add your first item.</p>';
            return;
        }

        const itemsByCategory = {};
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            if (!itemsByCategory[item.category]) itemsByCategory[item.category] = [];
            itemsByCategory[item.category].push(item);
        });

        let portfolioHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3>';
        PORTFOLIO_CATEGORY_ORDER.forEach(category => {
            if (itemsByCategory[category]) {
                portfolioHTML += `<h4 class="portfolio-category-title">${category}</h4><ul class="resource-list">`;
                itemsByCategory[category].forEach(item => {
                    portfolioHTML += `
                        <li data-doc-id="${item.id}" data-storage-path="${item.storagePath}">
                            <i class="far fa-file-alt"></i>
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="Uploaded: ${item.uploadedAt.toDate().toLocaleDateString()}">${item.description}</a>
                            <button class="cta-button-small danger" onclick="deletePortfolioItem(this, '${subject}', '${grade}')"><i class="fas fa-trash-alt"></i></button>
                        </li>`;
                });
                portfolioHTML += `</ul>`;
            }
        });
        container.innerHTML = portfolioHTML;
    } catch (error) {
        console.error("Error loading portfolio items for subject/grade:", error);
        container.innerHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><p class="error-message">Could not load portfolio items.</p>';
    }
}

/**
 * Sets up the "Print Portfolio" button functionality.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
function setupPortfolioPrint(teacherAuthData) {
    const printBtn = document.getElementById('print-portfolio-btn');
    if (!printBtn) return;
    printBtn.addEventListener('click', () => {
        const teacherNameEl = document.getElementById('print-cover-teacher-name'); // This element will display the preferred name
        const dateEl = document.getElementById('print-cover-date');
        if (teacherNameEl) teacherNameEl.textContent = `${teacherAuthData.preferredName || ''}`;
        if (dateEl) dateEl.textContent = `Generated on: ${new Date().toLocaleDateString()}`;
        window.print();
    });
}

/**
 * Sets up the "Generate Shareable Link" button functionality.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 * @param {string} subject - The subject for the link.
 * @param {string} grade - The grade for the link.
 */
function setupPortfolioLinkGenerator(teacherAuthData, subject, grade) {
    const generateBtn = document.getElementById('generate-share-link-btn');
    if (!generateBtn) return;

    generateBtn.onclick = () => {
        const outputArea = document.getElementById('portfolio-link-output-area');
        const linkInput = document.getElementById('generated-portfolio-link');
        const copyBtn = document.getElementById('copy-portfolio-link-btn');

        if (!teacherAuthData || !teacherAuthData.uid || !subject || !grade) {
            alert('Could not generate link. User ID, Subject, or Grade is missing.'); return;
        }

        const viewerPath = `../portfolio/portfolio-viewer.html?teacherId=${teacherAuthData.uid}&subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`;
        const fullUrl = new URL(viewerPath, window.location.href).href;

        linkInput.value = fullUrl;
        outputArea.style.display = 'block';

        copyBtn.onclick = () => {
            linkInput.select();
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Link'; }, 2000);
        };
    };
}

window.deletePortfolioItem = async (button, subject, grade) => {
    const listItem = button.closest('li');
    const docId = listItem.dataset.docId;
    const storagePath = listItem.dataset.storagePath;

    if (!confirm(`Are you sure you want to permanently delete this portfolio item?`)) return;

    try {
        await firebase.firestore().collection('teacher_portfolios').doc(docId).delete();
        await firebase.storage().ref(storagePath).delete();
        listItem.remove();
        alert('Item deleted successfully.');
        const userData = JSON.parse(sessionStorage.getItem('currentUser'));
        loadPortfolioItems(firebase.firestore(), userData, subject, grade);
    } catch (error) {
        console.error("Error deleting portfolio item:", error);
        alert('Failed to delete item. Please try again.');
    }
};