// js/portals/admins-portal/calendar-manager.js

/**
 * Manages the Official School Calendar settings in the Admin Portal.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function setupOfficialCalendarManager(db) {
    // --- STATE ---
    let calendarState = {
        terms: [
            { id: 1, name: 'Term 1', startDate: '', endDate: '', holidays: [] },
            { id: 2, name: 'Term 2', startDate: '', endDate: '', holidays: [] },
            { id: 3, name: 'Term 3', startDate: '', endDate: '', holidays: [] },
            { id: 4, name: 'Term 4', startDate: '', endDate: '', holidays: [] }
        ],
        activeTerm: 1
    };

    // --- DOM ELEMENTS ---
    const termTabsContainer = document.getElementById('official-cal-term-tabs');
    const termDetailsContainer = document.getElementById('official-cal-term-details');
    const calendarStatusMessage = document.getElementById('official-calendar-status');

    if (!termTabsContainer) return; // Don't run if the elements aren't on the page

    // --- RENDER FUNCTIONS ---
    function render() {
        renderTermTabs();
        renderTermDetails();
    }

    function renderTermTabs() {
        termTabsContainer.innerHTML = calendarState.terms.map(term => `
            <button class="ap-tab-btn ${calendarState.activeTerm === term.id ? 'active' : ''}" data-term-id="${term.id}">
                ${term.name}
            </button>
        `).join('');
    }

    function renderTermDetails() {
        const term = calendarState.terms.find(t => t.id === calendarState.activeTerm);
        if (!term) return;

        termDetailsContainer.innerHTML = `
            <div class="ap-term-details" data-term-id="${term.id}">
                <div class="grid-container" style="grid-template-columns: 1fr 1fr;">
                    <div class="form-group">
                        <label for="official-term-start-${term.id}">Term Start Date</label>
                        <input type="date" id="official-term-start-${term.id}" class="ap-term-input" data-field="startDate" value="${term.startDate}">
                    </div>
                    <div class="form-group">
                        <label for="official-term-end-${term.id}">Term End Date</label>
                        <input type="date" id="official-term-end-${term.id}" class="ap-term-input" data-field="endDate" value="${term.endDate}">
                    </div>
                </div>
                <div style="margin-top: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h4>Holidays / Breaks</h4>
                        <button class="cta-button-small ap-add-holiday-btn"><i class="fas fa-plus"></i> Add Holiday</button>
                    </div>
                    <div class="ap-holidays-list">
                        ${term.holidays.map((h, i) => `
                            <div class="ap-holiday-row" data-index="${i}">
                                <input type="text" class="ap-holiday-input" data-field="name" placeholder="Holiday Name" value="${h.name}">
                                <input type="date" class="ap-holiday-input" data-field="start" value="${h.start}">
                                <input type="date" class="ap-holiday-input" data-field="end" value="${h.end}">
                                <button class="cta-button-small danger ap-remove-holiday-btn"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // --- EVENT HANDLERS ---
    termTabsContainer.addEventListener('click', e => {
        if (e.target.matches('.ap-tab-btn')) {
            calendarState.activeTerm = parseInt(e.target.dataset.termId);
            render();
        }
    });

    termDetailsContainer.addEventListener('change', e => {
        const termId = parseInt(e.target.closest('.ap-term-details').dataset.termId);
        const termIndex = calendarState.terms.findIndex(t => t.id === termId);

        if (e.target.matches('.ap-term-input')) {
            calendarState.terms[termIndex][e.target.dataset.field] = e.target.value;
        } else if (e.target.matches('.ap-holiday-input')) {
            const holidayIndex = parseInt(e.target.closest('.ap-holiday-row').dataset.index);
            calendarState.terms[termIndex].holidays[holidayIndex][e.target.dataset.field] = e.target.value;
        }
    });

    termDetailsContainer.addEventListener('click', e => {
        const termId = parseInt(e.target.closest('.ap-term-details').dataset.termId);
        const termIndex = calendarState.terms.findIndex(t => t.id === termId);

        if (e.target.matches('.ap-add-holiday-btn, .ap-add-holiday-btn *')) {
            calendarState.terms[termIndex].holidays.push({ name: '', start: '', end: '' });
            renderTermDetails();
        } else if (e.target.matches('.ap-remove-holiday-btn, .ap-remove-holiday-btn *')) {
            const holidayIndex = parseInt(e.target.closest('.ap-holiday-row').dataset.index);
            calendarState.terms[termIndex].holidays.splice(holidayIndex, 1);
            renderTermDetails();
        }
    });

    /**
     * Validates the entire calendar state.
     * @returns {string|null} An error message string if invalid, otherwise null.
     */
    function validateCalendarState() {
        for (const term of calendarState.terms) {
            if (term.startDate && term.endDate && term.startDate > term.endDate) {
                return `Error in ${term.name}: The start date cannot be after the end date.`;
            }
            for (const holiday of term.holidays) {
                if (holiday.start && holiday.end && holiday.start > holiday.end) {
                    return `Error in ${term.name}: A holiday's start date cannot be after its end date.`;
                }
            }
        }
        return null; // All valid
    }

    document.getElementById('save-official-calendar-btn').addEventListener('click', async (e) => {
        const saveBtn = e.currentTarget;
        calendarStatusMessage.textContent = '';
        calendarStatusMessage.classList.remove('success', 'error');

        const validationError = validateCalendarState();
        if (validationError) {
            calendarStatusMessage.textContent = validationError;
            calendarStatusMessage.classList.add('error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
        try {
            await db.collection('school_config').doc('main_calendar').set({
                terms: calendarState.terms,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }); // Use merge to be safer
            calendarStatusMessage.textContent = 'Official calendar saved successfully!';
            calendarStatusMessage.classList.add('success');
        } catch (error) {
            console.error("Error saving official school calendar:", error);
            calendarStatusMessage.textContent = 'An error occurred while saving. Please try again.';
            calendarStatusMessage.classList.add('error');
        } finally {
            setTimeout(() => {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Official Calendar';
                saveBtn.disabled = false;
                if (!calendarStatusMessage.classList.contains('error')) {
                    calendarStatusMessage.textContent = '';
                    calendarStatusMessage.classList.remove('success');
                }
            }, 2500);
        }
    });

    // --- DATA FUNCTIONS ---
    async function loadOfficialCalendar() {
        const docRef = db.collection('school_config').doc('main_calendar');
        try {
            const doc = await docRef.get();
            if (doc.exists && doc.data().terms) {
                // Deep copy to avoid state issues if a term is missing
                const loadedTerms = doc.data().terms;
                calendarState.terms.forEach((term, index) => {
                    const foundTerm = loadedTerms.find(lt => lt.id === term.id);
                    if (foundTerm) {
                        // Safer merge: ensure holidays is an array
                        calendarState.terms[index] = { 
                            ...term, ...foundTerm,
                            holidays: Array.isArray(foundTerm.holidays) ? foundTerm.holidays : []
                        };
                    }
                });
            }
        } catch (error) {
            console.error("Error loading official calendar:", error);
        } finally {
            render();
        }
    }

    // --- INITIALIZATION ---
    loadOfficialCalendar();
}