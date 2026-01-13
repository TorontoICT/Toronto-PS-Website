// js/portals/teachers-portal/settings.js

document.addEventListener('DOMContentLoaded', () => {
    setupPasswordChange();
    setupNotificationPreferences();
});

/**
 * Handles the password change functionality.
 */
function setupPasswordChange() {
    const form = document.getElementById('change-password-form');
    if (!form) return;

    // *** NEW: Add password checklist for the 'new-password' field ***
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordInput) {
        const reqList = document.createElement('ul');
        reqList.id = 'password-requirements-list-settings'; // Use a unique ID
        reqList.style.listStyle = 'none';
        reqList.style.padding = '0';
        reqList.style.marginTop = '8px';
        reqList.style.marginBottom = '15px';
        reqList.style.fontSize = '0.9rem';
        reqList.style.color = '#6b7280';

        const requirements = [
            { regex: /.{8,}/, text: 'At least 8 characters' },
            { regex: /[A-Z]/, text: 'One uppercase letter' },
            { regex: /[a-z]/, text: 'One lowercase letter' },
            { regex: /\d/, text: 'One number' },
            { regex: /[\W_]/, text: 'One special character' }
        ];

        requirements.forEach((req, index) => {
            const li = document.createElement('li');
            li.id = `pwd-req-settings-${index}`; // Use a unique ID
            li.innerHTML = `<i class="far fa-circle" style="margin-right: 8px; width: 16px; text-align: center;"></i> ${req.text}`;
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.marginBottom = '4px';
            li.style.transition = 'color 0.2s ease';
            reqList.appendChild(li);
        });

        newPasswordInput.parentNode.insertBefore(reqList, newPasswordInput.nextSibling);

        newPasswordInput.addEventListener('input', function() {
            const val = this.value;
            requirements.forEach((req, index) => {
                const li = document.getElementById(`pwd-req-settings-${index}`);
                const icon = li.querySelector('i');
                if (req.regex.test(val)) {
                    li.style.color = 'var(--primary-green, #10b981)';
                    icon.className = 'fas fa-check-circle';
                    icon.style.color = 'var(--primary-green, #10b981)';
                } else {
                    li.style.color = '#6b7280';
                    icon.className = 'far fa-circle';
                    icon.style.color = '#6b7280';
                }
            });
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Strong password validation
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!strongPasswordRegex.test(newPassword)) {
            // Replace alert with focus and UI update
            if (newPasswordInput) {
                newPasswordInput.focus();
                newPasswordInput.dispatchEvent(new Event('input'));
            }
            return;
        }

        const user = firebase.auth().currentUser;
        if (!user) {
            alert("You must be logged in to change your password.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Updating...';

        try {
            // Re-authenticate the user before changing password
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            
            // Update password
            await user.updatePassword(newPassword);
            
            alert("Password updated successfully!");
            form.reset();
            // Reset the checklist UI after successful password change
            if (newPasswordInput) {
                newPasswordInput.dispatchEvent(new Event('input'));
            }
        } catch (error) {
            console.error("Password update error:", error);
            if (error.code === 'auth/wrong-password') {
                alert("The current password you entered is incorrect.");
            } else if (error.code === 'auth/requires-recent-login') {
                alert("For security, please log out and log back in before changing your password.");
            } else {
                alert(`Error: ${error.message}`);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';
        }
    });
}

/**
 * Handles loading and saving notification preferences.
 */
function setupNotificationPreferences() {
    const editBtn = document.getElementById('edit-notification-prefs-btn');
    const modal = document.getElementById('notification-prefs-modal');
    const form = document.getElementById('notification-prefs-form');
    
    if (!editBtn || !modal || !form) return;

    // Open Modal and Load Preferences
    editBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        modal.style.display = 'block';
        
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                const doc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (doc.exists) {
                    const prefs = doc.data().notificationPreferences || {};
                    document.getElementById('pref-email-messages').checked = prefs.emailMessages !== false; // Default true
                    document.getElementById('pref-sms-urgent').checked = prefs.smsUrgent !== false; // Default true
                    document.getElementById('pref-browser-notifications').checked = prefs.browserNotifications !== false; // Default true
                }
            } catch (err) {
                console.error("Error loading preferences:", err);
            }
        }
    });

    // Close Modal Logic
    const closeBtn = modal.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    // Save Preferences
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if (!user) return;

        const saveBtn = form.querySelector('button[type="submit"]');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const prefs = {
            emailMessages: document.getElementById('pref-email-messages').checked,
            smsUrgent: document.getElementById('pref-sms-urgent').checked,
            browserNotifications: document.getElementById('pref-browser-notifications').checked
        };

        try {
            await firebase.firestore().collection('users').doc(user.uid).set({
                notificationPreferences: prefs
            }, { merge: true });
            alert("Preferences saved successfully.");
            modal.style.display = 'none';
        } catch (err) {
            console.error("Error saving preferences:", err);
            alert("Failed to save preferences.");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Preferences';
        }
    });
}
