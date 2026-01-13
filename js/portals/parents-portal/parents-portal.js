// js/portals/parents-portal/parents-portal.js

import { displayOfficialSchoolCalendar } from './calendar-display.js';

// Firebase config moved to js/shared/firebase-config.js

document.addEventListener('DOMContentLoaded', () => {
    initializeParentPortal();
});

/**
 * Main initialization function for the Parent Portal.
 */
function initializeParentPortal() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!userData || userData.role !== 'parent') {
        console.error("User data not found or role is not 'parent'. Redirecting.");
        window.location.href = 'auth.html';
        return;
    }

    const db = firebase.firestore();

    // Load dynamic data into the portal
    // **MODIFIED**: Call the profile setup functions
    loadParentProfile(db, userData);
    setupParentProfileEditing(db, userData);
    setupParentProfilePictureUpload(db, userData);

    loadParentDashboard(db, userData);
    setupParentChatEngine(db, userData);

    // Set up UI interactions
    setupResponsiveSidebar();
    setupPortalNavigation(db);
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

async function loadParentProfile(db, userData) {
    const profileName = document.querySelector('#profile .profile-name');
    const profileEmail = document.querySelector('#profile .profile-email');
    const profileContact = document.querySelector('#profile .profile-contact');
    const parentUidInput = document.getElementById('parent-uid');

    if (profileName) profileName.innerHTML = `<strong>Name:</strong> ${userData.name || 'N/A'}`;
    if (profileEmail) profileEmail.innerHTML = `<strong>Email:</strong> ${userData.email || 'N/A'}`;
    if (profileContact) profileContact.innerHTML = `<strong>Contact:</strong> ${userData.contactNumber || 'N/A'}`;

    // **FIX**: Automatically populate the hidden UID field in the form.
    // This is crucial for linking the parent's auth account to their child's record.
    if (parentUidInput && userData.uid) {
        parentUidInput.value = userData.uid;
    }
}

/**
 * Loads dynamic data for the parent's dashboard.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} parentData - The authenticated parent's data.
 */
async function loadParentDashboard(db, parentData) {
    const overdueEl = document.getElementById('dashboard-overdue');
    const gradeEl = document.getElementById('dashboard-grade');
    const eventEl = document.getElementById('dashboard-event');

    // Placeholder for fetching learner-specific data
    try {
        // Find the learner associated with this parent
        const learnerQuery = db.collection('sams_registrations').where('parentUserId', '==', parentData.uid).limit(1);
        const learnerSnapshot = await learnerQuery.get();

        if (!learnerSnapshot.empty) {
            const learnerData = learnerSnapshot.docs[0].data();
            document.getElementById('learner-name-display').textContent = `${learnerData.learnerName || 'Your Child'}`;

            // These would be replaced with real data fetching logic
            if (overdueEl) overdueEl.textContent = '0 (Excellent!)';
            if (gradeEl) gradeEl.textContent = '85% (Maths)';
            if (eventEl) eventEl.textContent = 'Sports Day: 01 Dec';

        } else {
            if (overdueEl) overdueEl.textContent = 'N/A';
            if (gradeEl) gradeEl.textContent = 'N/A';
            if (eventEl) eventEl.textContent = 'N/A';
        }
    } catch (error) {
        console.error("Error loading parent dashboard data:", error);
        if (overdueEl) overdueEl.textContent = 'Error';
        if (gradeEl) gradeEl.textContent = 'Error';
        if (eventEl) eventEl.textContent = 'Error';
    }
}

function setupPortalNavigation(db) {
    const navLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.portal-section');

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
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            showSection(targetId);
            history.pushState(null, null, `#${targetId}`);

            // Initialize calendar when navigating to its section
            if (targetId === 'school-calendar') {
                displayOfficialSchoolCalendar(db, 'parent-official-calendar-container');
            }
        });
    });

    const initialHash = window.location.hash.substring(1) || 'dashboard';
    showSection(initialHash);
    const initialLink = document.querySelector(`.sidebar a[href="#${initialHash}"]`);
    if (initialLink) initialLink.classList.add('active');

    // Initialize calendar if the page loads on its hash
    if (initialHash === 'school-calendar') {
        displayOfficialSchoolCalendar(db, 'parent-official-calendar-container');
    }
}

// =========================================================
// === PARENT CHAT ENGINE ===
// =========================================================

let parentActiveChatListener = null;

/**
 * Initializes the chat system for the parent's portal.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} parentData - The authenticated parent's data.
 */
function setupParentChatEngine(db, parentData) {
    const chatList = document.getElementById('parent-chat-list');
    if (!chatList) return;

    // Listen for any chats where the parent is a participant
    db.collection('chats')
      .where('parentId', '==', parentData.uid)
      .orderBy('lastMessageTimestamp', 'desc')
      .onSnapshot(snapshot => {
          if (snapshot.empty) {
              chatList.innerHTML = '<p class="info-message">You have no conversations yet.</p>';
              return;
          }

          chatList.innerHTML = ''; // Clear list
          snapshot.forEach(doc => {
              const chat = doc.data();
              const li = document.createElement('li');
              li.dataset.chatId = doc.id;
              li.dataset.teacherId = chat.teacherId;
              li.dataset.teacherName = chat.teacherName;

              li.innerHTML = `
                  <span class="parent-name">${chat.teacherName}</span>
                  <span class="learner-name">Regarding: ${chat.learnerName}</span>
                  ${chat.unreadByParentCount > 0 ? `<span class="unread-badge">${chat.unreadByParentCount}</span>` : ''}
              `;
              li.addEventListener('click', () => openParentChat(db, parentData, chat, li));
              chatList.appendChild(li);
          });
      }, error => {
          console.error("Error fetching parent chats:", error);
          chatList.innerHTML = '<p class="error-message">Could not load conversations.</p>';
      });
}

/**
 * Opens a chat window with a specific teacher.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} parentData - The authenticated parent's data.
 * @param {object} chatData - The data for the selected chat.
 * @param {HTMLElement} listItem - The clicked list item element.
 */
async function openParentChat(db, parentData, chatData, listItem) {
    document.querySelectorAll('#parent-chat-list li').forEach(li => li.classList.remove('active'));
    listItem.classList.add('active');

    const chatWindow = document.getElementById('parent-chat-window');
    document.getElementById('parent-chat-welcome-message').style.display = 'none';
    chatWindow.style.display = 'flex';
    // Ensure chat window is visible before adding messages

    const chatId = listItem.dataset.chatId;

    chatWindow.innerHTML = `
        <div class="chat-header" style="background-color: #005e54; color: white; padding: 10px 15px; display: flex; align-items: center; gap: 15px;">
            <button id="parent-chat-back-btn" style="background: none; border: none; color: white; font-size: 1.2em; cursor: pointer;">
                <i class="fas fa-arrow-left"></i>
            </button>
            <div style="background: #ccc; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-user" style="color: #fff;"></i>
            </div>
            <div style="flex-grow: 1;">
                <div style="font-weight: 600;">${chatData.teacherName}</div>
                <div style="font-size: 0.8em; opacity: 0.8;">Regarding: ${chatData.learnerName}</div>
            </div>
            <div style="display: flex; gap: 20px; font-size: 1.2em;">
                <button style="background: none; border: none; color: white; cursor: pointer;"><i class="fas fa-video"></i></button>
                <button style="background: none; border: none; color: white; cursor: pointer;"><i class="fas fa-phone"></i></button>
                <button style="background: none; border: none; color: white; cursor: pointer;"><i class="fas fa-ellipsis-v"></i></button>
            </div>
        </div>
        <div class="chat-messages chat-bg scroll-container" id="parent-chat-messages-container"></div>
        <div class="chat-input-area" style="background-color: #f0f2f5; padding: 8px 12px; display: flex; align-items: center; gap: 10px;">
            <button style="background: none; border: none; font-size: 1.5em; color: #54656f; cursor: pointer;"><i class="far fa-grin"></i></button>
            <button style="background: none; border: none; font-size: 1.5em; color: #54656f; cursor: pointer;"><i class="fas fa-paperclip"></i></button>
            <input type="text" id="parent-chat-message-input" placeholder="Type a message" style="flex-grow: 1; border: none; border-radius: 20px; padding: 10px 15px; font-size: 1em; outline: none;">
            <button id="parent-chat-send-btn" style="background-color: #00a884; color: white; border: none; border-radius: 50%; width: 45px; height: 45px; font-size: 1.2em; cursor: pointer; display: none;">
                <i class="fas fa-paper-plane"></i>
            </button>
            <button id="parent-chat-mic-btn" style="background-color: #00a884; color: white; border: none; border-radius: 50%; width: 45px; height: 45px; font-size: 1.2em; cursor: pointer;">
                <i class="fas fa-microphone"></i>
            </button>
        </div>
    `;

    document.getElementById('parent-chat-back-btn').addEventListener('click', () => {
        goBackToParentChatList();
    });

    const messagesContainer = document.getElementById('parent-chat-messages-container');
    const messageInput = document.getElementById('parent-chat-message-input');
    const sendBtn = document.getElementById('parent-chat-send-btn');
    const micBtn = document.getElementById('parent-chat-mic-btn');

    // Logic to show send button or mic button
    messageInput.addEventListener('input', () => {
        if (messageInput.value.trim()) {
            sendBtn.style.display = 'block';
            micBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'none';
            micBtn.style.display = 'block';
        }
    });

    if (parentActiveChatListener) {
        parentActiveChatListener();
    }

    const messagesRef = db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'asc');
    parentActiveChatListener = messagesRef.onSnapshot(snapshot => {
        messagesContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            const isSent = msg.senderId === parentData.uid;
            messageDiv.classList.add(isSent ? 'sent' : 'received');

            let messageContentHTML = `<p>${msg.text}</p>`;
            let messageInfoHTML = '';

            if (msg.timestamp && typeof msg.timestamp.toDate === 'function') { // Always show timestamp
                const timeString = msg.timestamp.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                messageInfoHTML += `<span class="timestamp">${timeString}</span>`;
                messageDiv.title = msg.timestamp.toDate().toLocaleString();
            }
            if (isSent) { // Only show status icon for sent messages
                messageInfoHTML += getParentMessageStatusHTML(msg.status);
            }
            if (messageInfoHTML) {
                messageContentHTML += `<div class="message-info">${messageInfoHTML}</div>`;
            }
            messageDiv.innerHTML = messageContentHTML;
            messagesContainer.appendChild(messageDiv);
            // Scroll to the latest message
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    });

    // Mark messages as read when opening the chat
    const chatRef = db.collection('chats').doc(chatId);
    chatRef.set({ unreadByParentCount: 0 }, { merge: true });

    // Find all unread messages from the teacher and mark them as 'read'
    try {
        const unreadMessagesQuery = db.collection('chats').doc(chatId).collection('messages')
            .where('senderId', '==', chatData.teacherId) // Be specific
            .where('status', '==', 'sent'); // Only update sent messages
        const unreadSnapshot = await unreadMessagesQuery.get();

        if (!unreadSnapshot.empty) {
            const batch = db.batch();
            unreadSnapshot.forEach(doc => {
                batch.update(doc.ref, { status: 'read' });
            });
            await batch.commit();
        }
    } catch (error) {
        // This might fail if an index is required. The console will provide a link to create it.
        console.error("Could not mark messages as read. This may require a Firestore index.", error);
    }


    const sendMessage = async () => {
        const text = messageInput.value.trim();
        if (text === '') return;

        messageInput.value = '';
        // After sending, hide send button and show mic button again
        if (sendBtn && micBtn) {
            sendBtn.style.display = 'none';
            micBtn.style.display = 'block';
        }

        // Re-use chatRef from above
        const messagePayload = {
            text: text,
            senderId: parentData.uid,
            senderName: parentData.name || 'Parent', // **FIX**: Ensure parent's name is included
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'sent' // Add status field
        };

        const batch = db.batch();
        batch.set(chatRef.collection('messages').doc(), messagePayload);
        batch.set(chatRef, {
            lastMessage: text,
            lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            unreadByTeacherCount: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });

        await batch.commit();
    };

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent new line in input
            sendMessage();
        }
    });
}

/**
 * Generates the HTML for the message status icon for the parent's portal.
 * @param {string} status - The status of the message ('sent', 'read').
 * @returns {string} The HTML string for the icon.
 */
function getParentMessageStatusHTML(status) {
    let iconClass = 'fas fa-check'; // Default for 'sent'
    let title = 'Sent';

    if (status === 'read') {
        iconClass = 'fas fa-check-double'; // Blue double check for 'read'
        title = 'Read';
    }

    return `<span class="message-status" title="${title}"><i class="${iconClass}"></i></span>`;
}

/**
 * Hides the chat window and returns to the chat list view for parents.
 */
function goBackToParentChatList() {
    if (parentActiveChatListener) {
        parentActiveChatListener(); // Unsubscribe from the current chat listener
        parentActiveChatListener = null;
    }
    document.getElementById('parent-chat-window').style.display = 'none';
    document.getElementById('parent-chat-welcome-message').style.display = 'flex'; // Show welcome message
    // Remove the global click listener when chat is closed
    document.removeEventListener('click', globalParentChatMenuClickListener);
    document.querySelectorAll('#parent-chat-list li').forEach(li => li.classList.remove('active'));
}

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
