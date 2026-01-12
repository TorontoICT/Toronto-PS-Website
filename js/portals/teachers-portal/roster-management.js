// js/portals/teachers-portal/roster-management.js

/**
 * Sets up the logic for the Annual Class Roster Setup tool.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function setupRosterManagement(db) {
    const rosterSetupClassSelect = document.getElementById('roster-setup-class-select');
    const managementArea = document.getElementById('roster-management-area');
    const searchInput = document.getElementById('roster-learner-search-input');
    const searchBtn = document.getElementById('learner-search-btn');
    const searchResultsContainer = document.getElementById('learner-search-results');
    const manualAddForm = document.getElementById('manual-add-learner-form');
    const currentRosterContainer = document.getElementById('current-roster-list');

    if (!rosterSetupClassSelect) return;

    rosterSetupClassSelect.addEventListener('change', () => {
        const selectedClass = rosterSetupClassSelect.value;
        if (selectedClass) {
            managementArea.style.display = 'block';
            loadCurrentRoster(db, selectedClass, currentRosterContainer);
        } else {
            managementArea.style.display = 'none';
        }
    });

    searchBtn.addEventListener('click', async () => {
        const selectedClass = rosterSetupClassSelect.value;
        const rawSearchTerm = searchInput.value.trim();

        if (!selectedClass) {
            alert("Please select your class from the dropdown before searching.");
            return;
        }
        if (rawSearchTerm.length < 3) {
            alert('Please enter at least 3 characters to search.');
            return;
        }

        const searchTerm = rawSearchTerm.charAt(0).toUpperCase() + rawSearchTerm.slice(1);
        searchResultsContainer.innerHTML = '<p class="info-message"><i class="fas fa-sync fa-spin"></i> Searching...</p>';

        try {
            const targetGradeStr = selectedClass.match(/^\d+|[R]/)[0];
            let sourceGrade = (targetGradeStr === 'R') ? null : (targetGradeStr === '1' ? 'R' : parseInt(targetGradeStr, 10) - 1);

            let query = db.collection('sams_registrations');
            if (sourceGrade !== null) {
                query = query.where('grade', '==', sourceGrade);
            }

            const endTerm = searchTerm.slice(0, -1) + String.fromCharCode(searchTerm.charCodeAt(searchTerm.length - 1) + 1);
            const querySnapshot = await query.where('learnerSurname', '>=', searchTerm).where('learnerSurname', '<', endTerm).limit(10).get();

            const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (results.length === 0) {
                let message = `No learners found with a surname starting with "${searchTerm}"`;
                if (sourceGrade !== null) message += ` in Grade ${sourceGrade}`;
                searchResultsContainer.innerHTML = `<p class="info-message">${message}.</p>`;
                return;
            }

            let resultsHTML = '<h4>Search Results</h4><ul class="search-results-list">';
            results.forEach(learner => {
                resultsHTML += `
                    <li>
                        <span>${learner.learnerName} ${learner.learnerSurname} (Adm: ${learner.admissionId}, Prev Class: ${learner.fullGradeSection || 'N/A'})</span>
                        <button class="cta-button-small" onclick="addLearnerToRoster('${learner.id}', '${rosterSetupClassSelect.value}')">Add to Class</button>
                    </li>`;
            });
            resultsHTML += '</ul>';
            searchResultsContainer.innerHTML = resultsHTML;
        } catch (error) {
            console.error('Error searching for learners:', error);
            searchResultsContainer.innerHTML = '<p class="error-message">An error occurred during search.</p>';
        }
    });

    if (manualAddForm) {
        manualAddForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedClass = rosterSetupClassSelect.value;
            const statusMessage = document.getElementById('manual-add-status');
            statusMessage.style.display = 'block';

            if (!selectedClass) {
                statusMessage.textContent = 'Please select your class before adding a learner.';
                statusMessage.className = 'status-message-box error';
                return;
            }

            const admissionId = document.getElementById('manual-admission-id').value.trim();
            const learnerName = document.getElementById('manual-learner-name').value.trim();
            const learnerSurname = document.getElementById('manual-learner-surname').value.trim();

            if (!admissionId || !learnerName || !learnerSurname) {
                statusMessage.textContent = 'Please fill in all fields: Admission ID, First Name, and Last Name.';
                statusMessage.className = 'status-message-box error';
                return;
            }

            statusMessage.textContent = 'Checking for existing learner and adding...';
            statusMessage.className = 'status-message-box info';

            try {
                const existingLearnerSnap = await db.collection('sams_registrations').where('admissionId', '==', admissionId).limit(1).get();
                if (!existingLearnerSnap.empty) {
                    statusMessage.textContent = `Error: A learner with Admission ID "${admissionId}" already exists.`;
                    statusMessage.className = 'status-message-box error';
                    return;
                }

                const grade = selectedClass.match(/^\d+|[R]/)[0];
                const section = selectedClass.replace(grade, '');

                await db.collection('sams_registrations').add({
                    admissionId, learnerName, learnerSurname,
                    grade: (grade === 'R') ? 'R' : parseInt(grade, 10),
                    section, fullGradeSection: selectedClass,
                    importedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                statusMessage.textContent = 'Learner successfully added to your class!';
                statusMessage.className = 'status-message-box success';
                manualAddForm.reset();
                loadCurrentRoster(db, selectedClass, currentRosterContainer);
            } catch (error) {
                console.error('Error manually adding learner:', error);
                statusMessage.textContent = 'An error occurred. Please try again.';
                statusMessage.className = 'status-message-box error';
            }
        });
    }

    setupExcelRosterUpload(db);

    window.addLearnerToRoster = async (docId, targetClass) => {
        if (!confirm(`Are you sure you want to add this learner to class ${targetClass}? This will update their official class assignment.`)) return;
        const grade = targetClass.match(/^\d+|[R]/)[0];
        const section = targetClass.replace(grade, '');
        try {
            await db.collection('sams_registrations').doc(docId).update({
                fullGradeSection: targetClass, section,
                grade: (grade === 'R') ? 'R' : parseInt(grade, 10)
            });
            alert('Learner added successfully!');
            loadCurrentRoster(db, targetClass, currentRosterContainer);
            searchResultsContainer.innerHTML = '';
            searchInput.value = '';
        } catch (error) {
            console.error('Error adding learner to roster:', error);
            alert('Failed to add learner.');
        }
    };

    window.removeLearnerFromRoster = async (docId, targetClass) => {
        if (!confirm('Are you sure you want to remove this learner from your class? This will unassign them.')) return;
        try {
            await db.collection('sams_registrations').doc(docId).update({ fullGradeSection: null, section: null });
            alert('Learner removed successfully!');
            loadCurrentRoster(db, targetClass, currentRosterContainer);
        } catch (error) {
            console.error('Error removing learner from roster:', error);
            alert('Failed to remove learner.');
        }
    };
}

/**
 * Loads and displays the current list of learners assigned to a class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} className - The class to load the roster for.
 * @param {HTMLElement} container - The container to render the list into.
 */
async function loadCurrentRoster(db, className, container) {
    container.innerHTML = '<h4>Current Roster</h4><p class="info-message"><i class="fas fa-sync fa-spin"></i> Loading current roster...</p>';
    try {
        const snapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', className).get();
        if (snapshot.empty) {
            container.innerHTML = '<h4>Current Roster</h4><p class="info-message">This class is currently empty.</p>';
            return;
        }

        const learners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (`${a.learnerSurname} ${a.learnerName}`).localeCompare(`${b.learnerSurname} ${b.learnerName}`));

        let rosterHTML = '<h4>Current Roster</h4><ul class="current-roster-list">';
        learners.forEach(learner => {
            rosterHTML += `
                <li>
                    <span>${learner.learnerName} ${learner.learnerSurname} (Adm: ${learner.admissionId})</span>
                    <button class="cta-button-small danger" onclick="removeLearnerFromRoster('${learner.id}', '${className}')">Remove</button>
                </li>`;
        });
        rosterHTML += '</ul>';
        container.innerHTML = rosterHTML;
    } catch (error) {
        console.error('Error loading current roster:', error);
        container.innerHTML = '<h4>Current Roster</h4><p class="error-message">Failed to load roster.</p>';
    }
}

/**
 * Sets up the functionality for uploading and processing an Excel roster.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function setupExcelRosterUpload(db) {
    const processBtn = document.getElementById('process-excel-btn');
    const fileInput = document.getElementById('excel-roster-upload');
    const statusContainer = document.getElementById('excel-upload-status');
    const classSelect = document.getElementById('roster-setup-class-select');

    if (!processBtn) return;

    processBtn.addEventListener('click', () => {
        const selectedClass = classSelect.value;
        const file = fileInput.files[0];

        if (!selectedClass) {
            alert('Please select your responsible class before processing a file.');
            return;
        }
        if (!file) {
            alert('Please select an Excel file to upload.');
            return;
        }

        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Processing...';
        statusContainer.innerHTML = `<p class="info-message">Reading file...</p>`;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const learners = XLSX.utils.sheet_to_json(worksheet, { header: ["Admission Number", "First Name", "Last Name"], range: 1 });

                if (learners.length === 0) throw new Error("The Excel file is empty or not formatted correctly.");

                statusContainer.innerHTML = `<p class="info-message">File read successfully. Found ${learners.length} learners. Now updating database...</p>`;

                const batch = db.batch();
                const grade = selectedClass.match(/^\d+|[R]/)[0];
                const section = selectedClass.replace(grade, '');
                let processedCount = 0;
                let errorMessages = [];

                for (const learner of learners) {
                    const admissionId = String(learner['Admission Number']).trim();
                    const firstName = String(learner['First Name']).trim();
                    const lastName = String(learner['Last Name']).trim();

                    if (!admissionId || !firstName || !lastName) {
                        errorMessages.push(`Skipped a row due to missing data.`);
                        continue;
                    }

                    const snapshot = await db.collection('sams_registrations').where('admissionId', '==', admissionId).limit(1).get();
                    const gradeValue = (grade === 'R') ? 'R' : parseInt(grade, 10);

                    if (snapshot.empty) {
                        const newLearnerRef = db.collection('sams_registrations').doc();
                        batch.set(newLearnerRef, { admissionId, learnerName: firstName, learnerSurname: lastName, grade: gradeValue, section, fullGradeSection: selectedClass, importedAt: firebase.firestore.FieldValue.serverTimestamp() });
                    } else {
                        batch.update(snapshot.docs[0].ref, { grade: gradeValue, section, fullGradeSection: selectedClass });
                    }
                    processedCount++;
                }

                await batch.commit();
                statusContainer.innerHTML = `<p class="success-message">${processedCount} learners have been successfully added/updated for class ${selectedClass}.</p>`;
                if (errorMessages.length > 0) statusContainer.innerHTML += `<p class="error-message">${errorMessages.join('<br>')}</p>`;
                loadCurrentRoster(db, selectedClass, document.getElementById('current-roster-list'));
            } catch (error) {
                console.error("Error processing Excel file:", error);
                statusContainer.innerHTML = `<p class="error-message">Error: ${error.message}. Please ensure the file is a valid Excel file and columns are named correctly.</p>`;
            } finally {
                processBtn.disabled = false;
                processBtn.innerHTML = '<i class="fas fa-cogs"></i> Process File';
                fileInput.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    });
}