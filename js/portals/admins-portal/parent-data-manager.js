// js/portals/admins-portal/parent-data-manager.js

// NOTE: This script relies on the global 'db' variable from firebase-config.js

/**
 * Loads parent data from the 'sams_registrations' collection based on a grade filter.
 * @param {string} filterGrade - The grade to filter by ('All', 'R', '1', etc.).
 * @param {string} filterClass - The class section to filter by ('All', 'A', 'B', etc.).
 */
async function loadAllParentData(filterGrade = 'All', filterClass = 'All') {
    const container = document.getElementById('parents-data-container');
    const statusMessage = document.getElementById('parents-data-status');

    container.innerHTML = '';
    let statusText = `Fetching parent data for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}`;
    if (filterClass !== 'All') {
        statusText += `, Class ${filterClass}`;
    }
    statusMessage.textContent = statusText + '...';
    statusMessage.style.display = 'block';
    try {
        let query = db.collection('sams_registrations');
        if (filterGrade !== 'All') {
            const gradeValue = filterGrade === 'R' ? 'R' : parseInt(filterGrade, 10);
            query = query.where('grade', '==', gradeValue);
        }

        if (filterClass !== 'All') {
            query = query.where('section', '==', filterClass);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            statusMessage.textContent = `No parent data found for the selected grade.`;
            return;
        }

        const parentsData = [];
        const uniqueParentEmails = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            // Ensure we have at least a parent email and it's not a duplicate for this specific list
            if (data.parent1Email && !uniqueParentEmails.has(data.parent1Email)) {
                parentsData.push(data);
                uniqueParentEmails.add(data.parent1Email);
            }
        });

        if (parentsData.length === 0) {
            statusMessage.textContent = 'No parent contact information found in the filtered results.';
            return;
        }

        // Sort data by parent name
        parentsData.sort((a, b) => (a.parent1Name || '').localeCompare(b.parent1Name || ''));

        const table = document.createElement('table');
        table.id = 'parents-data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Parent Name</th>
                    <th>Parent Email</th>
                    <th>Parent Contact</th>
                    <th>Learner Name</th>
                    <th>Learner Class</th>
                </tr>
            </thead>
            <tbody>
                ${parentsData.map(data => `
                    <tr>
                        <td>${data.parent1Name || 'N/A'}</td>
                        <td>${data.parent1Email || 'N/A'}</td>
                        <td>${data.parent1Contact || 'N/A'}</td>
                        <td>${data.learnerName || ''} ${data.learnerSurname || ''}</td>
                        <td>${data.fullGradeSection || data.grade || 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        container.appendChild(table);
        statusMessage.textContent = `Displaying ${parentsData.length} parent contact(s).`;

    } catch (error) {
        console.error("Error loading parent data:", error);
        statusMessage.textContent = 'An error occurred while loading data. Check the console.';
        if (error.code === 'failed-precondition') {
            statusMessage.innerHTML += '<br><strong>Action Required:</strong> This query requires a composite index. Please check the browser console for a link to create it in Firebase.';
        }
        statusMessage.classList.add('error');
    }
}