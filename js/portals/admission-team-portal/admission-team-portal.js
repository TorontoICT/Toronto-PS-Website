// === IMPORTANT: Use the URL from the Application Form for fetching submissions ===
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyYCBiHB7oaAchC--LfvJhpAOqOOqVNYtsd90-2g4gHp1LHzkz_7lhrMMvVaD41Pmyr3g/exec';


// Global variable to store all fetched applications for quick access/interaction
let allApplicationsData = [];

// Status options for the Admissions Team
const STATUS_OPTIONS = [
    'New Submission', 
    'In Review', 
    'Interview Scheduled', 
    'Offer Extended', 
    'Offer Accepted',
    'Waitlisted',
    'Rejected'
];

// --- CORE DATA HANDLING & DISPLAY FUNCTIONS ---

/**
 * Loads and displays the list of all submitted applications.
 * This is the main function called by the "Load Data" button and after a status update.
 */
function loadAllApplications() {
    const button = document.getElementById('load-data-btn');
    
    // Check if the button exists before trying to access properties
    const hasButton = !!button; 
    

    // 1. Show Loading State on Button and All Sections
    if (hasButton) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-sync fa-spin"></i> Loading...';
    }
    
    // Clear ALL data containers and show loading message
    const allDataContainers = document.querySelectorAll('.data-table-container');
    allDataContainers.forEach(c => {
        // Updated loading message to be dynamic
        c.innerHTML = '<p class="loading-message"><i class="fas fa-sync fa-spin"></i> Fetching application submissions...</p>';
    });
    
    fetch(APPS_SCRIPT_URL)
        .then(response => {
            const contentType = response.headers.get("content-type");
            if (!response.ok || !contentType || !contentType.includes("application/json")) {
                throw new Error('Apps Script returned an error or non-JSON content. Check deployment permissions.');
            }
            return response.json();
        })
        .then(data => {
            const applications = Array.isArray(data) ? data : (data.data || []);
            allApplicationsData = applications; 
            
            // 2. Update button state and metrics
            if (hasButton) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-database"></i> Reload Applications Data';
            }
            document.getElementById('metric-total-count').textContent = applications.length;

            // 3. Filter and display data in ALL status sections
            // This is the function that automatically sends data to the correct sidebar section
            displayApplicationsByStatus(applications);

        })
        .catch(error => {
            // 4. Handle error state
            if (hasButton) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Load Data Failed (Retry)';
            }
            console.error('Error fetching application data:', error);
            const allDataContainers = document.querySelectorAll('.data-table-container');
            allDataContainers.forEach(c => {
                c.innerHTML = '<p class="error-message"><i class="fas fa-exclamation-triangle"></i> Failed to load application data. Check Apps Script URL and deployment.</p>';
            });
        });
}

/**
 * Filters the main data set and renders tables in the appropriate sections.
 * @param {Array<Object>} applications - The full list of application data.
 */
function displayApplicationsByStatus(applications) {
    
    // Define the status groups using ONLY lowercase strings for robust filtering.
    const groups = {
        'applicant-list-new': ['new submission'], 
        'applicant-list-review': ['in review', 'interview scheduled'],
        'applicant-list-offers': ['offer extended', 'offer accepted'],
        'applicant-list-waitlist': ['waitlisted'],
        'applicant-list-rejected': ['rejected'] 
    };

    let newCount = 0;
    let offersCount = 0; 

    // Filter and render for each group
    for (const containerId in groups) {
        const statuses = groups[containerId];
        
        const filteredData = applications.filter(app => {
            // CRITICAL: Use app["Status"] and convert it to lowercase for case-insensitive filtering
            const sheetStatus = (app["Status"] || 'New Submission').toLowerCase();
            
            // Update Dashboard Metrics while filtering (also check lowercase)
            if (sheetStatus === 'new submission') newCount++;
            if (sheetStatus === 'offer extended' || sheetStatus === 'offer accepted') offersCount++;
            
            // Return true if the normalized status matches one of the target lowercase statuses
            return statuses.includes(sheetStatus);
        });

        const container = document.getElementById(containerId);
        if (container) {
            renderApplicantTable(container, filteredData);
        }
    }

    // Update Dashboard Metrics
    document.getElementById('metric-new-count').textContent = newCount;
    document.getElementById('metric-offers-count').textContent = offersCount;
}

/**
 * Renders the HTML table into a specified container.
 * @param {HTMLElement} container - The DOM element to render the table into.
 * @param {Array<Object>} filteredApplications - The list of applications for this table.
 */
function renderApplicantTable(container, filteredApplications) {
    container.innerHTML = ''; // Clear existing content

    if (filteredApplications.length === 0) {
        // Updated message to be more generic, as data loads automatically
        container.innerHTML = '<p class="info-message">No applications currently found in this stage.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = "data-table admissions-table";
    
    let tableHTML = `
        <thead class="bg-gray-50">
            <tr>
                <th>Date/Time</th>
                <th>Learner Name</th>
                <th>Grade Applied</th>
                <th>Current Status</th>
                <th>Documents</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
    `;

    filteredApplications.forEach(app => {
        // Find the index in the original global array (crucial for viewApplicantDetails)
        const originalIndex = allApplicationsData.findIndex(item => 
            item["timestamp"] === app["timestamp"] && 
            item["learner-name"] === app["learner-name"]
        );

        const timestamp = app["timestamp"] || 'N/A';
        const learnerName = `${app["learner-name"] || ''} ${app["learner-surname"] || 'N/A'}`;
        const grade = app["grade"] || 'N/A';
        // Use the corrected header key: "Status"
        const status = app["Status"] || 'New Submission'; 
        const statusClass = status.replace(/\s+/g, '-').toLowerCase();

        // **NEW**: Build the document links dropdown for the new column
        const docLinks = [ // **FIX**: Use all-lowercase keys to match Google Sheet headers
            { key: 'birthcertificateurl', label: "Birth Certificate" },
            { key: 'parentidurl', label: 'Parent ID' },
            { key: 'proofofresidenceurl', label: 'Proof of Residence' },
            { key: 'reportcardurl', label: 'Report Card' }
        ];

        let hasDocs = false;
        let linksHTML = '';
        docLinks.forEach(doc => {
            if (app[doc.key]) {
                hasDocs = true;
                linksHTML += `<a href="${app[doc.key]}" class="document-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt"></i> ${doc.label}</a>`;
            }
        });

        let docsCellHTML = '<span class="no-docs">No Docs</span>';
        if (hasDocs) {
            docsCellHTML = `<div class="docs-dropdown-container"><button class="cta-button-small secondary" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">View</button><div class="docs-dropdown">${linksHTML}</div></div>`;
        }
        
        tableHTML += `
            <tr>
                <td>${timestamp}</td>
                <td>${learnerName}</td>
                <td>${grade}</td>
                <td><span class="status-badge status-${statusClass}">${status}</span></td>
                <td>${docsCellHTML}</td>
                <td class="py-2">
                    <button onclick="viewApplicantDetails(${originalIndex})" class="cta-button-small"><i class="fas fa-search mr-2"></i> Details</button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `</tbody>`;
    table.innerHTML = tableHTML;
    container.appendChild(table);

    // Apply Tailwind classes to the dynamically generated table to match admin portal style
    const newTable = container.querySelector('.data-table');
    if (newTable) {
        newTable.classList.add('min-w-full', 'divide-y', 'divide-gray-200', 'shadow-md');
        newTable.querySelectorAll('th').forEach(th => {
            th.classList.add('px-6', 'py-3', 'text-left', 'text-xs', 'font-medium', 'text-gray-500', 'uppercase', 'tracking-wider', 'bg-gray-50');
        });
        newTable.querySelectorAll('td').forEach(td => {
            td.classList.add('px-6', 'py-4', 'whitespace-nowrap', 'text-sm', 'text-gray-800');
        });
        newTable.querySelectorAll('tbody tr:nth-child(even)').forEach(tr => {
            tr.classList.add('bg-gray-50');
        });
    }

}


/**
 * Handles viewing the full details of an applicant using the global data array index.
 * @param {number} index - The index of the applicant in the allApplicationsData array.
 */
function viewApplicantDetails(index) {
    const applicant = allApplicationsData[index];

    if (!applicant) {
        alert("Applicant record not found.");
        return;
    }

    // Row number is index + 2 (since sheet is 1-based and row 1 is headers)
    const sheetRowNumber = index + 2; 
    const learnerFullName = `${applicant["learner-name"] || ''} ${applicant["learner-surname"] || 'N/A'}`; 
    
    // Keys to exclude from the main details grid for a cleaner view
    // Exclude file URLs from the main grid as they will be displayed separately.
    const EXCLUDE_KEYS = ['timestamp', 'Status', 'Row Number', 'birthcertificateurl', 'parentidurl', 'proofofresidenceurl', 'reportcardurl']; 

    // Build details view (using the keys from the Google Sheet)
    let detailsHTML = `
        <h3>Application Details: ${learnerFullName}</h3>
        <p><strong>Submission ID (Row):</strong> ${sheetRowNumber}</p>
        <div class="applicant-details-grid">
    `;
    
    for (const key in applicant) {
        if (applicant.hasOwnProperty(key)) {
            // Skip excluded keys
            if (EXCLUDE_KEYS.includes(key)) continue; 

            const readableKey = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            // Use 'Not Provided' for empty values
            const value = applicant[key] || 'Not Provided';

            detailsHTML += `
                <div class="detail-item">
                    <strong>${readableKey}:</strong> 
                    <span>${value}</span>
                </div>
            `;
        }
    }

    detailsHTML += `</div><hr>`;

    // **NEW**: Section for uploaded documents
    const docLinks = [ // **FIX**: Use all-lowercase keys to match Google Sheet headers
        { key: 'birthcertificateurl', label: "Learner's Birth Certificate" },
        { key: 'parentidurl', label: 'Parent/Guardian ID' },
        { key: 'proofofresidenceurl', label: 'Proof of Residence' },
        { key: 'reportcardurl', label: 'Latest School Report' }
    ];

    detailsHTML += `<h4>Uploaded Documents</h4><ul class="document-links-list">`;
    docLinks.forEach(doc => {
        if (applicant[doc.key]) {
            detailsHTML += `<li><a href="${applicant[doc.key]}" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt"></i> ${doc.label}</a></li>`;
        }
    });
    detailsHTML += `</ul><hr>`;

    // Status Dropdown and Update Button
    // Use the corrected header key: "Status"
    const currentStatus = applicant["Status"] || 'New Submission'; 
    
    detailsHTML += `
        <div class="status-update-controls">
            <h4>Update Application Status</h4>
            <select id="new-status-${sheetRowNumber}" class="status-dropdown">
                ${STATUS_OPTIONS.map(status => `
                    <option value="${status}" ${currentStatus === status ? 'selected' : ''}>${status}</option>
                `).join('')}
            </select>
            <button onclick="updateApplicantStatus(${sheetRowNumber})" class="cta-button">Update Status</button>
        </div>
    `;

    // Modal Display Logic
    const modalContent = document.getElementById('applicant-modal-content');
    const modal = document.getElementById('applicant-details-modal');

    if (modal && modalContent) {
        modalContent.innerHTML = detailsHTML;
        modal.style.display = 'block';

        document.querySelector('.modal-close-btn').onclick = function() {
            modal.style.display = 'none';
        }
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    }
}


/**
 * Sends a request to the Google Apps Script to update the status of a specific row.
 * @param {number} row - The 1-based row number in the Google Sheet.
 */
async function updateApplicantStatus(row) {
    // **FIX**: Initialize Firestore to perform the duplication check.
    if (!firebase.apps.length) {
        // This config should match your other portal files.
        const firebaseConfig = {
            apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
            authDomain: "school-website-66326.firebaseapp.com",
            projectId: "school-website-66326",
        };
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    const statusSelect = document.getElementById(`new-status-${row}`);
    const newStatus = statusSelect.value;
    const applicant = allApplicationsData[row - 2]; // Get applicant data from global array

    // **CRITICAL FIX**: If the new status is "Offer Accepted", check for duplicates first.
    if (newStatus === 'Offer Accepted' && applicant && applicant['admission-id']) {
        const admissionId = applicant['admission-id'];
        try {
            const query = db.collection('sams_registrations').where('admissionId', '==', admissionId).limit(1);
            const snapshot = await query.get();

            if (!snapshot.empty) {
                alert(`Error: A learner with Admission ID "${admissionId}" already exists in the school system. You cannot accept this offer again. Please choose a different status or contact the administrator.`);
                return; // Stop the function to prevent creating a duplicate.
            }
        } catch (error) {
            console.error("Error checking for duplicate learner:", error);
            alert("A database error occurred while checking for duplicates. Please try again.");
            return;
        }
    }

    if (!confirm(`Are you sure you want to update Row ${row} to status: ${newStatus} AND send an email update to the applicant?`)) {
        return;
    }
    
    // The Apps Script will handle the status update AND the email sending
    const updateUrl = `${APPS_SCRIPT_URL}?action=updateStatus&row=${row}&status=${encodeURIComponent(newStatus)}`;
    
    try {
        const response = await fetch(updateUrl);
        const result = await response.json();

        if (result.status === 'success') {
            alert(`Status updated successfully to: ${newStatus}!\nAn email notification has been sent.\nRefreshing all tables...`);
            
            document.getElementById('applicant-details-modal').style.display = 'none';
            // CRITICAL: Reload ALL data and re-render ALL tables
            loadAllApplications(); 
        } else {
            alert(`Update Failed: ${result.message || 'Unknown error.'}`);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Network error during status update. Check console for details.');
    }
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
            e.stopPropagation(); // Prevent the click from closing the menu immediately
            sidebar.classList.toggle('is-open');
            if (contentWrapper) {
                contentWrapper.classList.toggle('overlay-active');
            }
        });
    }

    // Add a listener to the main content area to close the sidebar when clicking outside
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
 * Sets up the manual application form submission logic.
 */
function setupManualApplicationForm() {
    const form = document.getElementById('manual-application-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const statusMessage = document.getElementById('manual-submission-status');

        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        statusMessage.style.display = 'block';
        statusMessage.className = 'status-message-box info';
        statusMessage.textContent = 'Submitting application data...';

        const formData = new FormData(form);

        fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData })
            .then(response => {
                if (response.ok) {
                    return response.text(); // Or .json() if your script returns JSON
                }
                throw new Error('Network response was not ok.');
            })
            .then(data => {
                statusMessage.className = 'status-message-box success';
                statusMessage.textContent = 'Application submitted successfully! You can view it in the "New Submissions" tab after reloading the data.';
                form.reset();
            })
            .catch(error => {
                console.error('Error submitting manual application:', error);
                statusMessage.className = 'status-message-box error';
                statusMessage.textContent = 'An error occurred during submission. Please check the console and try again.';
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Application';
            });
    });
}


// --- Profile and Navigation Setup ---

function setupPortalNavigation() {
    // Add this block to handle form styling consistency
    const allForms = document.querySelectorAll('.application-form');
    allForms.forEach(form => {
        form.classList.add('p-6', 'bg-white', 'rounded-lg', 'shadow-md', 'space-y-6');
    });

    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    const sections = document.querySelectorAll('.portal-section');

    function showSection(targetId) {
        sections.forEach(section => {
            section.classList.remove('active-section'); // This class adds the top border color
            section.style.display = 'none'; // We use direct style to hide/show
            if (section.id === targetId) {
                section.classList.add('active-section');
                section.style.display = 'block';
            }
        });
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            sidebarLinks.forEach(l => l.classList.remove('active-link'));
            this.classList.add('active-link');
            const targetId = this.getAttribute('href').substring(1);
            showSection(targetId);
        });
    });

    const initialHash = window.location.hash.substring(1) || 'dashboard';
    showSection(initialHash);
    const initialLink = document.querySelector(`.sidebar ul li a[href="#${initialHash}"]`);
    if (initialLink) {
        initialLink.classList.add('active-link');
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Expose functions to the global scope for HTML event handlers
    window.viewApplicantDetails = viewApplicantDetails;
    window.loadAllApplications = loadAllApplications;
    window.updateApplicantStatus = updateApplicantStatus; 

    // **NEW**: Initialize the responsive sidebar functionality
    setupResponsiveSidebar();

    setupPortalNavigation();
    // Load all data automatically upon page load
    window.loadAllApplications();

    // **NEW**: Set up the listener for the manual application form
    setupManualApplicationForm();
});

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
