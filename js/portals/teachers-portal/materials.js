// js/portals/teachers-portal/materials.js

/**
 * Sets up the form for uploading course materials.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
function setupMaterialUpload(db, teacherAuthData) {
    const form = document.getElementById('upload-material-form');
    if (!form) return;

    const subjectSelect = document.getElementById('material-subject');
    const gradeSelect = document.getElementById('material-grade');

    db.collection('users').doc(teacherAuthData.uid).get().then(doc => {
        if (doc.exists) {
            const teacherData = doc.data();
            const subjects = new Set();
            const grades = new Set();
            if (teacherData.teachingAssignments) {
                teacherData.teachingAssignments.forEach(a => {
                    subjects.add(a.subject);
                    grades.add(a.grade);
                });
            }
            subjects.forEach(subject => subjectSelect.add(new Option(subject, subject)));
            grades.forEach(grade => gradeSelect.add(new Option(`Grade ${grade}`, grade)));
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const statusMessage = document.getElementById('upload-status-message');

        const subject = document.getElementById('material-subject').value;
        const grade = document.getElementById('material-grade').value;
        const description = document.getElementById('material-description').value;
        const file = document.getElementById('material-file').files[0];

        if (!subject || !grade || !description || !file) {
            alert('Please fill out all fields and select a file.');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Uploading...';
        statusMessage.textContent = 'Upload in progress... Please wait.';
        statusMessage.className = 'status-message-box info';
        statusMessage.style.display = 'block';

        try {
            const storageRef = firebase.storage().ref();
            const filePath = `course_materials/${grade}/${subject}/${Date.now()}_${file.name}`;
            const fileRef = storageRef.child(filePath);
            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            await db.collection('course_materials').add({
                fileName: file.name, description, subject, grade, url: downloadURL, storagePath: filePath,
                uploadedBy: teacherAuthData.uid, uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMessage.textContent = 'File uploaded successfully!';
            statusMessage.className = 'status-message-box success';
            form.reset();
        } catch (error) {
            console.error("Error uploading file:", error);
            statusMessage.textContent = 'An error occurred during upload. Please try again.';
            statusMessage.className = 'status-message-box error';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload File';
        }
    });
}

/**
 * Loads and displays the list of available course materials.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function loadCourseMaterials(db) {
    const listElement = document.getElementById('materials-list');
    if (!listElement) return;

    db.collection('course_materials').orderBy('uploadedAt', 'desc').limit(20).onSnapshot(snapshot => {
        if (snapshot.empty) {
            listElement.innerHTML = '<p class="info-message">No course materials have been uploaded yet.</p>';
            return;
        }
        listElement.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            const iconClass = data.fileName.includes('.pdf') ? 'fa-file-pdf' : 'fa-file-alt';
            return `<li><i class="far ${iconClass}"></i><a href="${data.url}" target="_blank" rel="noopener noreferrer">${data.description} (${data.subject} - Grade ${data.grade})</a></li>`;
        }).join('');
    }, error => {
        console.error("Error loading course materials:", error);
        listElement.innerHTML = '<p class="info-message error">Could not load materials.</p>';
    });
}