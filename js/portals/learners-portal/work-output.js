import { showSection } from './navigation.js';

/**
 * Sets up the event listeners for the Work Output section.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data.
 * @param {object} profileData - The full learner profile data.
 */
export function setupWorkOutputSection(db, authData, profileData) {
    const viewWorkOutputBtn = document.querySelector('.view-work-output-btn');
    const backToAcademicsFromWorkOutputBtn = document.getElementById('back-to-academics-from-work-output-btn');

    if (viewWorkOutputBtn && backToAcademicsFromWorkOutputBtn) {
        viewWorkOutputBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('work-output');
            renderWorkOutputForm(db, authData, profileData);
        });
        backToAcademicsFromWorkOutputBtn.addEventListener('click', () => {
            showSection('academics');
        });

        // Handle view switching in Work Output section
        const logBtn = document.getElementById('work-output-log-btn');
        const historyBtn = document.getElementById('work-output-history-btn');
        const logView = document.getElementById('work-output-log-view');
        const historyView = document.getElementById('work-output-history-view');

        logBtn.addEventListener('click', () => {
            logBtn.classList.add('active');
            historyBtn.classList.remove('active');
            logView.style.display = 'block';
            historyView.style.display = 'none';
            renderWorkOutputForm(db, authData, profileData); // Re-render form view
        });

        historyBtn.addEventListener('click', () => {
            historyBtn.classList.add('active');
            logBtn.classList.remove('active');
            historyView.style.display = 'block';
            logView.style.display = 'none';
            renderWorkOutputHistory(db, authData); // Render history view
        });
    }
}

/**
 * Renders the form for learners to update their weekly work output.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data.
 * @param {object} profileData - The full learner profile data.
 */
async function renderWorkOutputForm(db, authData, profileData) {
	const contentDiv = document.getElementById('work-output-log-view');
	contentDiv.innerHTML = '<p>Loading your subjects...</p>';

	try {
		const userDoc = await db.collection('users').doc(authData.uid).get();
		if (!userDoc.exists || !userDoc.data().subjectsData) {
			contentDiv.innerHTML = '<p>You must select your subjects in the "My Subjects" section before you can log your work output.</p>';
			return;
		}

		const subjectsData = userDoc.data().subjectsData;
		const allSubjects = [
			`${subjectsData.homeLanguage} (HL)`,
			`${subjectsData.firstAdditionalLanguage} (FAL)`,
			...subjectsData.compulsorySubjects
		];

		let filterHTML = `
            <p>Select a subject, term, and week to log or view your work output.</p>
            <div class="work-output-filters">
                <select id="work-output-subject" class="filter-select"><option value="">-- Select Subject --</option>${allSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
                <select id="work-output-term" class="filter-select"><option value="">-- Select Term --</option>${[1,2,3,4].map(t => `<option value="${t}">Term ${t}</option>`).join('')}</select>
                <select id="work-output-week" class="filter-select" disabled><option value="">-- Select Week --</option></select>
            </div>
            <div id="work-output-form-container"></div>
        `;
		contentDiv.innerHTML = filterHTML;

		const termSelect = document.getElementById('work-output-term');
		const weekSelect = document.getElementById('work-output-week');
		const subjectSelect = document.getElementById('work-output-subject');

		termSelect.addEventListener('change', () => {
			weekSelect.disabled = true;
			weekSelect.innerHTML = '<option value="">-- Select Week --</option>';
			if (termSelect.value) {
				for (let i = 1; i <= 10; i++) { // Assuming 10 weeks per term
					weekSelect.add(new Option(`Week ${i}`, i));
				}
				weekSelect.disabled = false;
			}
			loadWorkOutputData();
		});

		subjectSelect.addEventListener('change', loadWorkOutputData);
		weekSelect.addEventListener('change', loadWorkOutputData);

		function loadWorkOutputData() {
			const subject = subjectSelect.value;
			const term = termSelect.value;
			const week = weekSelect.value;
			const formContainer = document.getElementById('work-output-form-container');

			if (subject && term && week) {
				renderWorkOutputInputForm(db, authData, { subject, term, week });
			} else {
				formContainer.innerHTML = ''; // Clear form if not all filters are set
			}
		}

	} catch (error) {
		console.error("Error rendering work output form:", error);
		contentDiv.innerHTML = '<p class="error-message">Could not load the work output form. Please try again.</p>';
	}
}

async function renderWorkOutputInputForm(db, authData, selection) {
	const { subject, term, week } = selection;
	const formContainer = document.getElementById('work-output-form-container');
	formContainer.innerHTML = '<p>Loading data...</p>';

	const year = new Date().getFullYear();
	const docId = `${authData.uid}_${year}_T${term}_W${week}_${subject.replace(/[^a-zA-Z0-9]/g, '-')}`;
	const docRef = db.collection('work_outputs').doc(docId);

	const doc = await docRef.get();
	const existingData = doc.exists ? doc.data() : {};

	const formHTML = `
        <form id="work-output-form">
            <div class="work-output-subject-card">
                <h4>${subject} - Term ${term}, Week ${week}</h4>
                <div class="work-output-grid">
                    <div>
                        <div class="form-group">
                            <label for="class-count">Class Activities Done</label>
                            <input type="number" id="class-count" min="0" placeholder="e.g., 3" value="${existingData.classActivitiesCount || ''}">
                        </div>
                        <div class="form-group">
                            <label for="class-topics">Topics Covered (Class)</label>
                            <textarea id="class-topics" placeholder="e.g., Fractions, Photosynthesis">${existingData.classTopics || ''}</textarea>
                        </div>
                    </div>
                    <div>
                        <div class="form-group">
                            <label for="home-count">Home Activities Done</label>
                            <input type="number" id="home-count" min="0" placeholder="e.g., 2" value="${existingData.homeActivitiesCount || ''}">
                        </div>
                        <div class="form-group">
                            <label for="home-topics">Topics Covered (Home)</label>
                            <textarea id="home-topics" placeholder="e.g., Homework on fractions">${existingData.homeTopics || ''}</textarea>
                        </div>
                    </div>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button type="submit" class="cta-button"><i class="fas fa-save"></i> Save Output for this Week</button>
                <p id="save-work-output-status" class="status-message-box" style="display: none;"></p>
            </div>
        </form>
    `;
	formContainer.innerHTML = formHTML;

	document.getElementById('work-output-form').addEventListener('submit', (e) => {
		e.preventDefault();
		saveWorkOutput(db, authData, selection, docId);
	});
}

/**
 * Saves the learner's weekly work output to Firestore.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data.
 * @param {object} selection - The selected subject, term, and week.
 * @param {string} docId - The specific document ID to save to.
 */
async function saveWorkOutput(db, authData, selection, docId) {
	const statusMessage = document.getElementById('save-work-output-status');
	const submitButton = document.querySelector('#work-output-form button[type="submit"]');
	submitButton.disabled = true;
	submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';

	const outputData = {
		learnerId: authData.uid,
		learnerName: `${authData.learnerName} ${authData.learnerSurname}`,
		subject: selection.subject,
		term: selection.term,
		week: selection.week,
		year: new Date().getFullYear(),
		classActivitiesCount: document.getElementById(`class-count`).value || 0,
		classTopics: document.getElementById(`class-topics`).value || '',
		homeActivitiesCount: document.getElementById(`home-count`).value || 0,
		homeTopics: document.getElementById(`home-topics`).value || '',
		updatedAt: firebase.firestore.FieldValue.serverTimestamp()
	};

	try {
		const docRef = db.collection('work_outputs').doc(docId);
		await docRef.set(outputData, { merge: true });

		statusMessage.textContent = 'Work output saved successfully!';
		statusMessage.className = 'status-message-box success';
	} catch (error) {
		console.error("Error saving work output:", error);
		statusMessage.textContent = 'An error occurred while saving. Please try again.';
		statusMessage.className = 'status-message-box error';
	} finally {
		statusMessage.style.display = 'block';
		submitButton.disabled = false;
		submitButton.innerHTML = '<i class="fas fa-save"></i> Save Output for this Week';
		setTimeout(() => { statusMessage.style.display = 'none'; }, 4000);
	}
}

/**
 * Fetches and renders the learner's work output history in a table.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} authData - The authenticated user's data.
 */
async function renderWorkOutputHistory(db, authData) {
	const historyView = document.getElementById('work-output-history-view');
	historyView.innerHTML = '<p>Loading filters...</p>';

	try {
		const userDoc = await db.collection('users').doc(authData.uid).get();
		const subjectsData = userDoc.exists ? userDoc.data().subjectsData : null;
		const allSubjects = subjectsData ? [
			`${subjectsData.homeLanguage} (HL)`,
			`${subjectsData.firstAdditionalLanguage} (FAL)`,
			...subjectsData.compulsorySubjects
		] : [];

		let filterHTML = `
            <p>Use the filters to find a specific work output entry. Click 'Update' to edit an entry.</p>
            <div class="work-output-filters">
                <select id="history-subject-filter"><option value="">-- All Subjects --</option>${allSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
                <select id="history-term-filter"><option value="">-- All Terms --</option>${[1,2,3,4].map(t => `<option value="${t}">Term ${t}</option>`).join('')}</select>
                <select id="history-week-filter" disabled><option value="">-- All Weeks --</option></select>
            </div>
            <div id="history-table-container"></div>
        `;
		historyView.innerHTML = filterHTML;

		const subjectFilter = document.getElementById('history-subject-filter');
		const termFilter = document.getElementById('history-term-filter');
		const weekFilter = document.getElementById('history-week-filter');

		termFilter.addEventListener('change', () => {
			weekFilter.disabled = true;
			weekFilter.innerHTML = '<option value="">-- All Weeks --</option>';
			if (termFilter.value) {
				for (let i = 1; i <= 10; i++) { weekFilter.add(new Option(`Week ${i}`, i)); }
				weekFilter.disabled = false;
			}
			fetchAndDisplayHistory();
		});

		subjectFilter.addEventListener('change', fetchAndDisplayHistory);
		weekFilter.addEventListener('change', fetchAndDisplayHistory);

		async function fetchAndDisplayHistory() {
			const tableContainer = document.getElementById('history-table-container');
			tableContainer.innerHTML = '<p>Loading history...</p>';

			let query = db.collection('work_outputs').where('learnerId', '==', authData.uid);

			if (subjectFilter.value) query = query.where('subject', '==', subjectFilter.value);
			if (termFilter.value) query = query.where('term', '==', termFilter.value);
			if (weekFilter.value) query = query.where('week', '==', weekFilter.value);

			query = query.orderBy('updatedAt', 'desc');

			const querySnapshot = await query.get();

			if (querySnapshot.empty) {
				tableContainer.innerHTML = '<p>No matching work output found for the selected filters.</p>';
				return;
			}

			let tableHTML = `
                <table class="data-table">
                    <thead><tr><th>Date</th><th>Subject</th><th>Term/Week</th><th>Class Activities</th><th>Home Activities</th><th>Action</th></tr></thead>
                    <tbody>
            `;

			querySnapshot.forEach(doc => {
				const data = doc.data();
				const date = data.updatedAt ? data.updatedAt.toDate().toLocaleDateString() : 'N/A';
				tableHTML += `
                    <tr>
                        <td>${date}</td>
                        <td>${data.subject}</td>
                        <td>Term ${data.term}, Week ${data.week}</td>
                        <td class="topics-cell"><b>Count:</b> ${data.classActivitiesCount}<br><b>Topics:</b> ${data.classTopics || '-'}</td>
                        <td class="topics-cell"><b>Count:</b> ${data.homeActivitiesCount}<br><b>Topics:</b> ${data.homeTopics || '-'}</td>
                        <td class="action-cell">
                            <button class="cta-button-small" data-subject="${data.subject}" data-term="${data.term}" data-week="${data.week}">Update</button>
                        </td>
                    </tr>
                `;
			});

			tableHTML += `</tbody></table>`;
			tableContainer.innerHTML = tableHTML;

			// Add event listeners to the new "Update" buttons
			tableContainer.querySelectorAll('.cta-button-small').forEach(button => {
				button.addEventListener('click', function() {
					const { subject, term, week } = this.dataset;
					
					// Switch to the "Log Output" tab
					document.getElementById('work-output-log-btn').click();

					// Pre-fill and trigger the form
					setTimeout(() => {
						const subjectSelect = document.getElementById('work-output-subject');
						const termSelect = document.getElementById('work-output-term');
						const weekSelect = document.getElementById('work-output-week');

						if (subjectSelect) subjectSelect.value = subject;
						if (termSelect) termSelect.value = term;
						
						// Manually populate weeks for the selected term
						if (termSelect.value) {
							weekSelect.innerHTML = '<option value="">-- Select Week --</option>';
							for (let i = 1; i <= 10; i++) { weekSelect.add(new Option(`Week ${i}`, i)); }
							weekSelect.disabled = false;
							weekSelect.value = week;
						}
						
						// Trigger change to load the form data
						weekSelect.dispatchEvent(new Event('change'));
					}, 100); // A small delay to ensure the view has switched
				});
			});
		}

		fetchAndDisplayHistory(); // Initial load

	} catch (error) {
		console.error("Error fetching work output history:", error);
		historyView.innerHTML = '<p class="error-message">Could not load your history. Please try again.</p>';
	}
}