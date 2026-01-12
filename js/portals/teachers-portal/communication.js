// js/portals/teachers-portal/communication.js

let activeChatListener = null; // Global to hold the active unsubscribe function
let currentChatContext = {}; // Global to hold the context of the active chat

const MESSAGE_TEMPLATES = {
    'positive-feedback': "Dear [Parent Name],\n\nI'm writing to share some positive feedback about [Learner Name]. They have been showing great effort in class recently, and I'm very pleased with their progress. Keep up the great work!\n\nBest regards,\n[Teacher Name]",
    'behavior-concern': "Dear [Parent Name],\n\nI'm writing to you today to discuss some behavioral concerns regarding [Learner Name] in class. I would like to partner with you to help support them.\n\nCould we schedule a brief call to talk about this further? Please let me know what time works best for you.\n\nSincerely,\n[Teacher Name]",
    'homework-reminder': "Hi [Parent Name],\n\nThis is a friendly reminder that the upcoming assignment for [Learner Name] is due soon. Please encourage them to complete and submit it on time.\n\nThank you for your support at home.\n\nBest regards,\n[Teacher Name]",
    'meeting-request': "Dear [Parent Name],\n\nI would like to schedule a meeting to discuss [Learner Name]'s progress. Please let me know what day and time would be convenient for you to meet either in person or virtually.\n\nI look forward to speaking with you.\n\nSincerely,\n[Teacher Name]",
};

/**
 * Sets up the event listener for the parent contacts class filter.
 * NOTE: This function and the next are for the separate "Parent Contacts" section, not the new Communication Center.
 * They are kept for legacy functionality but the new chat engine is the primary communication tool.
 */
function setupParentContactListeners() {
    const parentClassFilter = document.getElementById('teacher-parent-class-filter');
    if (parentClassFilter) {
        parentClassFilter.addEventListener('change', (e) => {
            const db = firebase.firestore();
            loadParentContactsForClass(db, e.target.value);
        });
    }
}

/**
 * Fetches and displays parent contact information for a specific class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} selectedClass - The class to filter by.
 */
async function loadParentContactsForClass(db, selectedClass) {
    const container = document.getElementById('teacher-parents-data-container');
    const statusMessage = document.getElementById('teacher-parents-data-status');
    container.innerHTML = '';

    if (!selectedClass) {
        statusMessage.textContent = 'Please select a class to view parent contacts.';
        statusMessage.style.display = 'block';
        return;
    }

    statusMessage.textContent = `Fetching parent contacts for Class ${selectedClass}...`;
    statusMessage.style.display = 'block';

    try {
        const snapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', selectedClass).get();

        if (snapshot.empty) {
            statusMessage.textContent = `No learners found for class ${selectedClass}.`;
            return;
        }

        const parentsData = [];
        const uniqueParentEmails = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.parent1Email && !uniqueParentEmails.has(data.parent1Email)) {
                parentsData.push(data);
                uniqueParentEmails.add(data.parent1Email);
            }
        });

        if (parentsData.length === 0) {
            statusMessage.textContent = 'No parent contact information found for this class.';
            return;
        }

        sortLearnersByName(parentsData);

        const table = document.createElement('table');
        table.id = 'teacher-parents-data-table';
        table.innerHTML = `
            <thead><tr><th>Parent Name</th><th>Parent Email</th><th>Parent Contact</th><th>Learner Name</th><th>Action</th></tr></thead>
            <tbody>${parentsData.map(data => `
                <tr>
                    <td>${data.parent1Name || 'N/A'}</td>
                    <td><a href="mailto:${data.parent1Email}">${data.parent1Email || 'N/A'}</a></td>
                    <td>${data.parent1Contact || 'N/A'}</td>
                    <td>${formatLearnerName(data)}</td>
                    <td><button class="cta-button-small" onclick='openContactModal(${JSON.stringify(data)})'>Contact</button></td>
                </tr>`).join('')}
            </tbody>`;
        container.appendChild(table);
        statusMessage.textContent = `Displaying ${parentsData.length} parent contact(s) for Class ${selectedClass}.`;
    } catch (error) {
        console.error("Error loading parent contacts:", error);
        statusMessage.textContent = 'An error occurred while loading data.';
        statusMessage.classList.add('error');
    }
}

/**
 * Opens the contact modal and populates it with parent/learner data.
 * @param {object} data - The parent/learner data object from Firestore.
 */
function openContactModal(data) {
    const modal = document.getElementById('contact-parent-modal');
    if (!modal) return;

    const emailForm = document.getElementById('contact-email-form');
    const smsForm = document.getElementById('contact-sms-form');
    emailForm.dataset.parentData = JSON.stringify(data);
    smsForm.dataset.parentData = JSON.stringify(data);

    document.getElementById('email-parent-name').textContent = data.parent1Name || 'N/A';
    document.getElementById('email-parent-email').textContent = data.parent1Email || 'N/A';
    document.getElementById('email-learner-name').textContent = formatLearnerName(data);
    document.getElementById('email-subject').value = `Update regarding ${data.learnerName || 'your child'}`;
    document.getElementById('email-message').value = '';

    document.getElementById('sms-parent-name').textContent = data.parent1Name || 'N/A';
    document.getElementById('sms-parent-contact').textContent = data.parent1Contact || 'N/A';
    document.getElementById('sms-learner-name').textContent = formatLearnerName(data);
    document.getElementById('sms-message').value = '';

    modal.style.display = 'block';
    emailForm.style.display = 'block';
    smsForm.style.display = 'none';
    document.getElementById('contact-via-email-btn').classList.add('active');
    document.getElementById('contact-via-sms-btn').classList.remove('active');
}

/**
 * Sets up event listeners for the contact modal.
 */
function setupContactModalListeners() {
    const modal = document.getElementById('contact-parent-modal');
    if (!modal) return;

    const closeModal = () => modal.style.display = 'none';
    modal.querySelector('.modal-close-btn').onclick = closeModal;
    window.onclick = (event) => { if (event.target == modal) closeModal(); };

    const emailBtn = document.getElementById('contact-via-email-btn');
    const smsBtn = document.getElementById('contact-via-sms-btn');
    const emailForm = document.getElementById('contact-email-form');
    const smsForm = document.getElementById('contact-sms-form');

    emailBtn.onclick = () => {
        emailForm.style.display = 'block'; smsForm.style.display = 'none';
        emailBtn.classList.add('active'); smsBtn.classList.remove('active');
    };
    smsBtn.onclick = () => {
        smsForm.style.display = 'block'; emailForm.style.display = 'none';
        smsBtn.classList.add('active'); emailBtn.classList.remove('active');
    };

    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const parentData = JSON.parse(e.target.dataset.parentData);
        const teacherData = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!teacherData || !teacherData.email) {
            alert('Error: Could not identify the sender. Please log in again.'); return;
        }

        const submitButton = emailForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Sending...';

        const scriptURL = 'https://script.google.com/macros/s/AKfycbyELV81r6M6MeGdclMhKKFBAvFVucm1WQC10YgqkCZSfbrK-JGM4wmTFGBa8-iUtRy1AA/exec';
        const formData = new FormData(emailForm);
        formData.append('teacherEmail', teacherData.email);
        formData.append('parentEmail', parentData.parent1Email);
        formData.append('parentName', parentData.parent1Name);
        formData.append('teacherName', teacherData.preferredName || 'Toronto Primary Teacher');
        formData.append('learnerName', formatLearnerName(parentData));

        fetch(scriptURL, { method: 'POST', body: formData })
            .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok.'))
            .then(result => {
                if (result.status === 'success') {
                    alert(result.message || 'Email sent successfully!');
                    closeModal();
                } else {
                    throw new Error(result.message || 'The script reported an error.');
                }
            }).catch(error => {
                console.error('Error sending email:', error);
                alert('An error occurred while sending the email. Please try again.');
            }).finally(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Email';
            });
    });

    smsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = JSON.parse(e.target.dataset.parentData);
        const body = document.getElementById('sms-message').value;
        const contactNumber = (data.parent1Contact || '').replace(/\s+/g, '');
        if (contactNumber) {
            window.location.href = `sms:${contactNumber}?body=${encodeURIComponent(body)}`;
        } else {
            alert('No valid contact number available for this parent.');
        }
        closeModal();
    });
}

/**
 * Initializes the chat system for the teacher's portal.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's data.
 */
async function setupChatEngine(db, teacherData) {
    const parentList = document.getElementById('chat-parent-list');
    const searchInput = document.getElementById('chat-parent-search');
    const classFilter = document.getElementById('chat-class-filter');
    if (!parentList) return;
    
    // --- Setup for new features ---
    const templateSelect = document.getElementById('message-template-select');
    const scheduleInput = document.getElementById('schedule-send-time');
    const clearScheduleBtn = document.getElementById('clear-schedule-btn');

    try {
        const teacherDoc = await db.collection('users').doc(teacherData.uid).get();
        if (!teacherDoc.exists) throw new Error("Teacher profile not found.");

        const teachingAssignments = teacherDoc.data().teachingAssignments || []; 
        const assignedClasses = [...new Set(teachingAssignments.map(a => a.fullClass).filter(Boolean))];

        classFilter.innerHTML = '<option value="all">All Classes</option>';
        assignedClasses.sort().forEach(className => classFilter.add(new Option(className, className)));

        if (assignedClasses.length === 0) {
            parentList.innerHTML = '<p class="info-message">You are not assigned to any classes to view parent contacts.</p>';
            return;
        }

        const parents = [];
        const uniqueParentEmails = new Set();
        for (const className of assignedClasses) {
            const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', className).get();
            learnersSnapshot.forEach(doc => {
                const learner = doc.data();
                // A parent is eligible for chat if they have a user account (parentUserId)
                if (learner.parentUserId && !uniqueParentEmails.has(learner.parent1Email)) {
                    parents.push({ parentId: learner.parentUserId, parentName: learner.parent1Name, parentEmail: learner.parent1Email, learnerName: formatLearnerName(learner), learnerId: doc.id, fullGradeSection: learner.fullGradeSection });
                    uniqueParentEmails.add(learner.parent1Email);
                }
            });
        }

        if (parents.length === 0) {
            parentList.innerHTML = '<p class="info-message">No parent contacts found for your assigned classes.</p>';
            return;
        }

        const updateParentList = () => {
            const filterClass = classFilter.value;
            const searchTerm = searchInput.value.toLowerCase();
            const filteredParents = parents.filter(p => (filterClass === 'all' || p.fullGradeSection === filterClass) && ((p.parentName || '').toLowerCase().includes(searchTerm) || (p.learnerName || '').toLowerCase().includes(searchTerm)));

            if (filteredParents.length === 0) {
                parentList.innerHTML = '<p class="info-message">No parents found matching your criteria.</p>';
                return;
            }

            // Clear the list before repopulating
            parentList.innerHTML = '';

            // Sort and then create and append each list item
            filteredParents.sort((a, b) => (a.parentName || '').localeCompare(b.parentName || '')).forEach(parent => {
                const li = document.createElement('li'); 
                // The parent object is passed directly to openChat, no need for dataset here for the click handler
                li.innerHTML = `
                    <span class="parent-name">${parent.parentName || 'Unknown Parent'}</span>
                    <span class="learner-name">(${parent.learnerName})</span>
                `;
                // Add the event listener to the actual DOM element
                li.addEventListener('click', () => openChat(db, teacherData, parent, li));
                parentList.appendChild(li);
            });
        };

        updateParentList();
        classFilter.addEventListener('change', updateParentList);
        searchInput.addEventListener('input', updateParentList);
    } catch (error) {
        console.error("Error setting up chat engine:", error);
        parentList.innerHTML = '<p class="error-message">Could not load parent list.</p>';
    }
}

/**
 * Opens a chat window with a specific parent.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's data.
 * @param {object} parentContext - The data for the selected parent, from the list item's dataset.
 * @param {HTMLElement} listItem - The clicked list item element.
 */
async function openChat(db, teacherData, parentContext, listItem) {
    document.querySelectorAll('#chat-parent-list li').forEach(li => li.classList.remove('active'));
    listItem.classList.add('active');

    const chatWindow = document.getElementById('chat-window');
    const welcomeMessage = document.getElementById('chat-welcome-message');

    // Store context globally for other functions to use
    currentChatContext = {
        db,
        teacherData,
        parentData: parentContext,
        chatId: [teacherData.uid, parentContext.parentId].sort().join('_')
    };

    // Reset UI
    // Dynamically build the WhatsApp-like interface
    welcomeMessage.style.display = 'none';
    chatWindow.style.display = 'flex';
    chatWindow.innerHTML = `
        <div class="chat-header" style="background-color: #005e54; color: white; padding: 10px 15px; display: flex; align-items: center; gap: 15px;">
            <div style="background: #ccc; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-user" style="color: #fff;"></i>
            </div>
            <div style="flex-grow: 1;">
                <div style="font-weight: 600;">${parentContext.parentName || 'N/A'}</div>
                <div style="font-size: 0.8em; opacity: 0.8;">Parent of ${parentContext.learnerName}</div>
            </div>
            <div style="display: flex; gap: 20px; font-size: 1.2em;">
                <button style="background: none; border: none; color: white; cursor: pointer;" title="Video Call (Feature coming soon)"><i class="fas fa-video"></i></button>
                <button style="background: none; border: none; color: white; cursor: pointer;" title="Voice Call (Feature coming soon)"><i class="fas fa-phone"></i></button>
                <button id="chat-actions-toggle" style="background: none; border: none; color: white; cursor: pointer;" title="More Actions"><i class="fas fa-ellipsis-v"></i></button>
            </div>
        </div>
        <div id="chat-messages-container" class="chat-messages scroll-container chat-bg">
            <!-- Messages will be loaded here -->
        </div>
        <div class="chat-input-area" style="background-color: #f0f2f5; padding: 8px 12px; display: flex; align-items: center; gap: 10px;">
            <button style="background: none; border: none; font-size: 1.5em; color: #54656f; cursor: pointer;" title="Emoji (Feature coming soon)"><i class="far fa-grin"></i></button>
            <button style="background: none; border: none; font-size: 1.5em; color: #54656f; cursor: pointer;" title="Attach File (Feature coming soon)"><i class="fas fa-paperclip"></i></button>
            <textarea id="chat-message-input" placeholder="Type a message..." rows="1" style="flex-grow: 1; border: none; border-radius: 20px; padding: 10px 15px; font-size: 1em; outline: none; resize: none;"></textarea>
            <button id="send-message-btn" style="background-color: #00a884; color: white; border: none; border-radius: 50%; width: 45px; height: 45px; font-size: 1.2em; cursor: pointer; display: none;" title="Send Message">
                <i class="fas fa-paper-plane"></i>
            </button>
            <button id="chat-mic-btn" style="background-color: #00a884; color: white; border: none; border-radius: 50%; width: 45px; height: 45px; font-size: 1.2em; cursor: pointer;" title="Voice Note (Feature coming soon)">
                <i class="fas fa-microphone"></i>
            </button>
        </div>
        <p id="chat-status-message" class="status-message-box" style="display: none;"></p>
    `;

    const messagesContainer = document.getElementById('chat-messages-container');
    const messageInput = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('send-message-btn');
    const micBtn = document.getElementById('chat-mic-btn');

    // Reset modal inputs
    const scheduleInput = document.getElementById('schedule-send-time');
    if (scheduleInput) scheduleInput.value = '';
    const templateSelect = document.getElementById('message-template-select');
    if (templateSelect) templateSelect.value = '';

    // Set up send button listeners
    sendBtn.onclick = () => handleSendMessage('portal');
    const emailBtn = document.getElementById('send-email-btn');
    if (emailBtn) emailBtn.onclick = () => handleSendMessage('email');
    const smsBtn = document.getElementById('send-sms-btn');
    if (smsBtn) smsBtn.onclick = () => handleSendMessage('sms');

    // Detach the old listener before attaching a new one
    if (activeChatListener) {
        activeChatListener();
    }

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

    // Attach listener for new messages
    const messagesRef = db.collection('chats').doc(currentChatContext.chatId).collection('messages').orderBy('timestamp', 'asc');
    activeChatListener = messagesRef.onSnapshot(snapshot => {
        messagesContainer.innerHTML = ''; // Clear previous messages
        if (snapshot.empty) {
            messagesContainer.innerHTML = '<p class="info-message">This is the beginning of your conversation.</p>';
        } else {
            snapshot.forEach(doc => {
                const msg = doc.data();
                const messageDiv = document.createElement('div');
                const isSentByMe = msg.senderId === teacherData.uid;
                messageDiv.classList.add('message', isSentByMe ? 'sent' : 'received');
                
                let timeString = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
                
                // Add read receipt icon for sent messages
                let readReceiptIcon = '';
                if (isSentByMe) {
                    if (msg.status === 'read') {
                        readReceiptIcon = '<i class="fas fa-check-double" title="Read"></i>';
                    } else if (msg.status === 'delivered') {
                        readReceiptIcon = '<i class="fas fa-check" title="Delivered"></i>';
                    }
                }

                messageDiv.innerHTML = `<p>${msg.text}</p><div class="message-info"><span class="timestamp">${timeString}</span>${readReceiptIcon}</div>`;
                messagesContainer.appendChild(messageDiv);
            });
        }
        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, error => {
        console.error("Error listening to chat messages:", error);
        messagesContainer.innerHTML = '<p class="error-message">Could not load messages.</p>';
    });

    // Mark messages as read by the teacher
    const chatRef = db.collection('chats').doc(currentChatContext.chatId);
    await chatRef.set({ unreadByTeacherCount: 0 }, { merge: true });

    // Re-initialize listeners for the newly created elements
    setupWhatsappLikeListeners(true);
}

/**
 * Handles the logic for sending a message via any method (portal, email, sms).
 * @param {string} method - The method of sending: 'portal', 'email', or 'sms'.
 */
async function handleSendMessage(method) {
    if (!currentChatContext.chatId) {
        alert("Please select a conversation first.");
        return;
    }

    const { db, teacherData, parentData, chatId } = currentChatContext;
    const messageInput = document.getElementById('chat-message-input');
    const scheduleInput = document.getElementById('schedule-send-time');
    const statusMessage = document.getElementById('chat-status-message');
    const text = messageInput.value.trim();

    // For portal messages, text is required. For scheduled, it's not (it's taken from the main input).
    if (method === 'portal' && !text) {
        alert("Please type a message.");
        return;
    }

    const sendTimeValue = scheduleInput.value;
    const sendTime = sendTimeValue ? new Date(sendTimeValue).getTime() : null;

    if (method !== 'portal' && !sendTime) {
        alert('Please select a date and time to schedule the message.');
        return;
    }

    const messagePayload = {
        text,
        method,
        teacherId: teacherData.uid,
        teacherName: `${teacherData.preferredName} ${teacherData.surname}`,
        parentId: parentData.parentId,
        parentName: parentData.parentName,
        parentEmail: parentData.parentEmail,
        parentContact: parentData.parentContact, // Assuming this is available
        learnerName: parentData.learnerName,
        learnerId: parentData.learnerId,
        chatId: chatId,
    };

    statusMessage.className = 'status-message-box info';
    statusMessage.style.display = 'block';

    try {
        // For scheduled messages, the text comes from the main input, not a separate one.
        if (method !== 'portal' && !text) {
            alert("Please type a message in the main input box before scheduling.");
            return;
        }

        if (method !== 'portal') {
            if (!sendTime || sendTime <= Date.now()) {
                alert('Please select a future time for scheduling.');
                return;
            }
            // Save to a 'scheduled_messages' collection for a backend function to process
            await db.collection('scheduled_messages').add({
                ...messagePayload,
                sendAt: firebase.firestore.Timestamp.fromMillis(sendTime),
                status: 'scheduled'
            });
            statusMessage.textContent = `Message scheduled for ${new Date(sendTime).toLocaleString()}.`;
            statusMessage.className = 'status-message-box success';
        } else {
            // Send immediately
            if (method === 'portal') {
                const portalPayload = {
                    text,
                    senderId: teacherData.uid,
                    senderName: `${teacherData.preferredName} ${teacherData.surname}`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'delivered' // Initially delivered, parent's client will update to 'read'
                };
                const batch = db.batch();
                const chatRef = db.collection('chats').doc(chatId);
                batch.set(chatRef.collection('messages').doc(), portalPayload);
                batch.set(chatRef, {
                    teacherId: teacherData.uid, teacherName: `${teacherData.preferredName} ${teacherData.surname}`, parentId: parentData.parentId, parentName: parentData.parentName,
                    learnerId: parentData.learnerId, learnerName: parentData.learnerName, lastMessage: text,
                    lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    unreadByParentCount: firebase.firestore.FieldValue.increment(1),
                    unreadByTeacherCount: 0 // Reset teacher count on send
                }, { merge: true });
                await batch.commit();
                statusMessage.textContent = 'Portal message sent successfully.';
                statusMessage.className = 'status-message-box success';
            }
        }
        // Clear inputs after successful operation
        messageInput.value = '';
        scheduleInput.value = '';
        // After sending, hide send button and show mic button again
        const sendBtn = document.getElementById('send-message-btn');
        const micBtn = document.getElementById('chat-mic-btn');
        if (sendBtn && micBtn) {
            sendBtn.style.display = 'none';
            micBtn.style.display = 'block';
        }
        // Close any open modals
        const scheduleModal = document.getElementById('schedule-modal');
        if (scheduleModal) scheduleModal.style.display = 'none';

        autoResizeTextarea(messageInput); // Resize textarea back to normal
    } catch (error) {
        console.error(`Error sending ${method} message:`, error);
        statusMessage.textContent = `Failed to send ${method}. Please try again.`;
        statusMessage.className = 'status-message-box error';
    } finally {
        setTimeout(() => { statusMessage.style.display = 'none'; }, 4000);
    }
}

/**
 * Populates the message input with a template when selected from the dropdown.
 */
function applyTemplate() {
    if (!currentChatContext.parentData) return;

    const templateSelect = document.getElementById('message-template-select');
    const messageInput = document.getElementById('chat-message-input');
    const selectedKey = templateSelect.value;

    if (selectedKey && MESSAGE_TEMPLATES[selectedKey]) {
        let templateText = MESSAGE_TEMPLATES[selectedKey];
        const { parentData, teacherData } = currentChatContext;

        // Replace placeholders
        templateText = templateText.replace(/\[Parent Name\]/g, parentData.parentName || 'Parent/Guardian');
        templateText = templateText.replace(/\[Learner Name\]/g, parentData.learnerName || 'your child');
        templateText = templateText.replace(/\[Teacher Name\]/g, `${teacherData.preferredName} ${teacherData.surname}` || 'The Teacher');

        messageInput.value = templateText;
        messageInput.focus();
        autoResizeTextarea(messageInput);
        document.getElementById('template-modal').style.display = 'none'; // Close modal
    }
}

// Make openContactModal globally accessible for the legacy "Parent Contacts" section
window.openContactModal = openContactModal;

/**
 * Sets up listeners for the new WhatsApp-like UI components.
 */
function setupWhatsappLikeListeners(isDynamicSetup = false) {
    const messageInput = document.getElementById('chat-message-input');
    const actionsToggle = document.getElementById('chat-actions-toggle');

    // If elements don't exist (e.g., on initial page load before a chat is opened), exit.
    if (!messageInput || !actionsToggle) {
        return;
    }

    // Auto-resize textarea
    messageInput.addEventListener('input', () => autoResizeTextarea(messageInput));

    // --- Modal Handling ---
    const templateModal = document.getElementById('template-modal');
    const scheduleModal = document.getElementById('schedule-modal');

    // Apply Template Button
    document.getElementById('apply-template-btn').addEventListener('click', applyTemplate);

    // Only set up general modal close listeners once on initial load
    if (!isDynamicSetup) {
        [templateModal, scheduleModal].forEach(modal => {
            if (!modal) return;
            modal.querySelector('.modal-close-btn').onclick = () => modal.style.display = 'none';
            window.addEventListener('click', (event) => {
                if (event.target == modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }
}

/**
 * Automatically adjusts the height of a textarea based on its content.
 * @param {HTMLTextAreaElement} textarea - The textarea element.
 */
function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

// Initial call to set up listeners for the new UI, assuming it's always present.
// The openChat function will re-bind the dynamic parts.
document.addEventListener('DOMContentLoaded', () => setupWhatsappLikeListeners(false));
