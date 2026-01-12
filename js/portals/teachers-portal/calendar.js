// js/portals/teachers-portal/calendar.js

import { displayOfficialSchoolCalendar } from '../parents-portal/calendar-display.js';

/**
 * Initializes the School Calendar section, sets up event listeners, and loads initial data.
 * This function is designed to be called when the calendar section becomes visible.
 */
export function setupCalendarSection(db, userData) {
    setupTermPlanner(db, userData);
    displayOfficialSchoolCalendar(db, 'official-calendar-container');
}

/**
 * Saves a new event from the manual entry form to Firestore.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {HTMLButtonElement} submitButton - The button that triggered the form submission.
 */

/**
 * Manages the Teacher's Personal Term Planner within the School Calendar section.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} userData - The currently logged-in user's data.
 */
function setupTermPlanner(db, userData) {
    // --- STATE ---
    let termState = {
        terms: [
            { id: 1, name: 'Term 1', startDate: '', endDate: '', examStart: '', examEnd: '', holidays: [] },
            { id: 2, name: 'Term 2', startDate: '', endDate: '', examStart: '', examEnd: '', holidays: [] },
            { id: 3, name: 'Term 3', startDate: '', endDate: '', examStart: '', examEnd: '', holidays: [] },
            { id: 4, name: 'Term 4', startDate: '', endDate: '', examStart: '', examEnd: '', holidays: [] }
        ],
        activeTerm: 1
    };
    const teacherUid = userData.uid;

    // --- DOM ELEMENTS ---
    const termTabsContainer = document.getElementById('ap-term-tabs');
    const termDetailsContainer = document.getElementById('ap-term-details-container');
    const fileUploadInput = document.getElementById('ap-calendar-upload');

    // --- RENDER FUNCTIONS ---
    function render() {
        renderTermTabs();
        renderTermDetails();
    }

    function renderTermTabs() {
        termTabsContainer.innerHTML = termState.terms.map(term => `
            <button class="ap-tab-btn ${termState.activeTerm === term.id ? 'active' : ''}" data-term-id="${term.id}">
                ${term.name}
            </button>
        `).join('');
    }

    function renderTermDetails() {
        const term = termState.terms.find(t => t.id === termState.activeTerm);
        if (!term) return;

        termDetailsContainer.innerHTML = `
            <div class="ap-term-details" data-term-id="${term.id}">
                <div class="ap-term-header">
                    <h3>${term.name} Dates & Holidays</h3>
                    <button class="cta-button primary-green ap-save-calendar-btn"><i class="fas fa-save"></i> Save My Calendar</button>
                </div>
                <div class="grid-container" style="grid-template-columns: 1fr 1fr;">
                    <div class="form-group"><label>Term Start Date</label><input type="date" class="ap-term-input" data-field="startDate" value="${term.startDate}"></div>
                    <div class="form-group"><label>Term End Date</label><input type="date" class="ap-term-input" data-field="endDate" value="${term.endDate}"></div>
                    <div class="form-group"><label>Exam Period Start</label><input type="date" class="ap-term-input" data-field="examStart" value="${term.examStart}"></div>
                    <div class="form-group"><label>Exam Period End</label><input type="date" class="ap-term-input" data-field="examEnd" value="${term.examEnd}"></div>
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
            termState.activeTerm = parseInt(e.target.dataset.termId);
            render();
        }
    });

    termDetailsContainer.addEventListener('change', e => {
        const termId = parseInt(e.target.closest('.ap-term-details').dataset.termId);
        const termIndex = termState.terms.findIndex(t => t.id === termId);

        if (e.target.matches('.ap-term-input')) {
            termState.terms[termIndex][e.target.dataset.field] = e.target.value;
        } else if (e.target.matches('.ap-holiday-input')) {
            const holidayIndex = parseInt(e.target.closest('.ap-holiday-row').dataset.index);
            termState.terms[termIndex].holidays[holidayIndex][e.target.dataset.field] = e.target.value;
        }
    });

    termDetailsContainer.addEventListener('click', e => {
        const termId = parseInt(e.target.closest('.ap-term-details').dataset.termId);
        const termIndex = termState.terms.findIndex(t => t.id === termId);

        if (e.target.matches('.ap-add-holiday-btn, .ap-add-holiday-btn *')) {
            termState.terms[termIndex].holidays.push({ name: '', start: '', end: '' });
            renderTermDetails();
        } else if (e.target.matches('.ap-remove-holiday-btn, .ap-remove-holiday-btn *')) {
            const holidayIndex = parseInt(e.target.closest('.ap-holiday-row').dataset.index);
            termState.terms[termIndex].holidays.splice(holidayIndex, 1);
            renderTermDetails();
        } else if (e.target.matches('.ap-save-calendar-btn, .ap-save-calendar-btn *')) {
            saveTeacherCalendar(e.target.closest('.ap-save-calendar-btn'));
        }
    });

    // --- DATA & FILE FUNCTIONS ---
    async function loadTeacherCalendar() {
        const docRef = db.collection('assessment_programmes').doc(teacherUid);
        try {
            const doc = await docRef.get();
            if (doc.exists && doc.data().terms) {
                termState.terms = doc.data().terms;
            }
        } catch (error) {
            console.error("Error loading teacher's calendar:", error);
        } finally {
            render();
        }
    }

    async function saveTeacherCalendar(saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
        try {
            await db.collection('assessment_programmes').doc(teacherUid).set({
                terms: termState.terms
            }, { merge: true });
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
        } catch (error) {
            console.error("Error saving teacher's calendar:", error);
            saveBtn.innerHTML = '<i class="fas fa-times"></i> Error';
        } finally {
            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save My Calendar';
            }, 2000);
        }
    }
    
    // --- INITIALIZATION ---
    loadTeacherCalendar();
}