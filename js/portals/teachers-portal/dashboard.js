// js/portals/teachers-portal/dashboard.js

/**
 * Loads and displays dynamic data for the teacher's dashboard.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
async function loadTeacherDashboard(db, teacherAuthData) {
    const eventsContainer = document.getElementById('dashboard-events');
    const notificationsContainer = document.getElementById('dashboard-notifications');

    if (eventsContainer) {
        // Placeholder for future calendar/event integration
        eventsContainer.innerHTML = `
            <strong>Today:</strong> Staff Meeting at 3 PM.<br>
            <strong>This Week:</strong> Report cards due Friday.
        `;
    }

    if (notificationsContainer) {
        try {
            // Fetch unread messages
            const chatSnapshot = await db.collection('chats')
                .where('teacherId', '==', teacherAuthData.uid)
                .where('unreadByTeacherCount', '>', 0)
                .get();

            const unreadMessages = chatSnapshot.size;

            notificationsContainer.innerHTML = `
                <i class="fas fa-envelope"></i> You have <strong>${unreadMessages}</strong> new message(s) from parents.<br>
                <i class="fas fa-bell"></i> All grades must be submitted by the end of the term.
            `;
        } catch (error) {
            console.error("Error loading dashboard notifications:", error);
            notificationsContainer.textContent = 'Could not load notifications.';
        }
    }
}