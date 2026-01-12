// js/portals/shared/calendar-display.js

/**
 * Fetches the official school calendar from Firestore and displays it in a specified container.
 * This function is designed to be used across all portals (Teacher, Parent, Learner, SMT).
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} containerId - The ID of the HTML element where the calendar should be rendered.
 */
export async function displayOfficialSchoolCalendar(db, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Calendar container with ID #${containerId} not found.`);
        return;
    }

    container.innerHTML = '<p class="info-message">Loading official school calendar...</p>';

    try {
        const docRef = db.collection('school_config').doc('main_calendar');

        // Clean up previous listener if called twice
        if (displayOfficialSchoolCalendar._unsubscribe) {
            displayOfficialSchoolCalendar._unsubscribe();
        }

        displayOfficialSchoolCalendar._unsubscribe = docRef.onSnapshot(doc => {
            if (!doc.exists || !doc.data() || !doc.data().terms) {
                container.innerHTML = '<p class="info-message">The official school calendar has not been set up by the administrator yet.</p>';
                return;
            }

            const terms = Array.isArray(doc.data().terms) ? doc.data().terms.slice() : [];
            terms.sort((a, b) => a.id - b.id);

            const calendarHtml = terms.map(term => {
                const startDate = term.startDate ? new Date(term.startDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not Set';
                const endDate = term.endDate ? new Date(term.endDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not Set';

                if (term.holidays && term.holidays.length > 0) {
                    term.holidays.sort((a, b) => new Date(a.start) - new Date(b.start));
                }

                return `
                    <div class="calendar-term-card">
                        <h3 class="calendar-term-title">${term.name}</h3>
                        <p class="calendar-term-dates">
                            <i class="fas fa-play-circle"></i> Starts: <strong>${startDate}</strong> | 
                            <i class="fas fa-stop-circle"></i> Ends: <strong>${endDate}</strong>
                        </p>
                        ${term.holidays && term.holidays.length > 0 ? `
                            <h4 class="calendar-holidays-title">Holidays & Breaks</h4>
                            <ul class="calendar-holidays-list">
                                ${term.holidays.map(holiday => {
                                    const holStart = holiday.start ? new Date(holiday.start + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '';
                                    const holEnd = holiday.end && holiday.end !== holiday.start ? ' - ' + new Date(holiday.end + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '';
                                    return `
                                        <li>
                                            <i class="fas fa-calendar-day"></i>
                                            <span>${holiday.name || 'Unnamed Holiday'}</span>
                                            <span class="holiday-date-range">${holStart}${holEnd}</span>
                                        </li>
                                    `;
                                }).join('')}
                            </ul>
                        ` : '<p class="calendar-no-holidays">No holidays scheduled for this term.</p>'}
                    </div>
                `;
            }).join('');

            container.innerHTML = calendarHtml || '<p class="info-message">Calendar data is available but could not be displayed.</p>';
        }, error => {
            console.error("Error listening to school calendar:", error);
            container.innerHTML = '<p class="info-message error">Could not load the school calendar due to an error. Please try again later.</p>';
        });
    } catch (error) {
        console.error("Error fetching or displaying school calendar:", error);
        container.innerHTML = '<p class="info-message error">Could not load the school calendar due to an error. Please try again later.</p>';
    }
}