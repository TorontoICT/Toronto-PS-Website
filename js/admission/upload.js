function doGet() {
  return HtmlService.createHtmlOutputFromFile('upload');
}

function adderFiles(fileDataArray) {
  try {
    const folderId = '1esShQTBizMFMQEQLCFRsPbDwlEqTVw8X'; // Replace with your folder ID
    const folder = DriveApp.getFolderById(folderId);
    
    const uploadedFileUrls = [];

    fileDataArray.forEach(fileData => {
      const base64Data = fileData.data.split(',')[1];
      const filename = fileData.filename;
      const mimeType = fileData.mimeType;

      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
      
      const fileAdded = folder.createFile(blob);
      uploadedFileUrls.push(fileAdded.getUrl());
    });
    
    return uploadedFileUrls.join('<br>');
  } catch (e) {
    return 'Error: ' + e.message;
  }
}


// This function is triggered when the form is submitted
      const myForm = document.querySelector('form');
      const message = document.querySelector('.message');
      
      myForm.addEventListener('submit', (e) => {
        e.preventDefault();
        message.textContent = 'Form Submitted...';
        
        const fileInputs = document.querySelectorAll('input[type="file"]');
        const filesToUpload = [];

        // Collect all files from the input fields
        fileInputs.forEach(input => {
          if (input.files.length > 0) {
            filesToUpload.push(input.files[0]);
          }
        });

        if (filesToUpload.length === 0) {
          message.textContent = 'Please select at least one file.';
          return;
        }

        // Read each file and convert to a base64 object
        const readFilePromises = filesToUpload.map(file => {
          return new Promise((resolve, reject) => {
            const fileR = new FileReader();
            fileR.onload = function(e) {
              resolve({
                filename: file.name,
                mimeType: file.type,
                data: e.target.result // Base64 encoded file data
              });
            };
            fileR.onerror = reject;
            fileR.readAsDataURL(file);
          });
        });

        // Wait for all files to be read before sending
        Promise.all(readFilePromises)
          .then(fileObjects => {
            google.script.run
              .withSuccessHandler(myResult)
              .adderFiles(fileObjects); // Call a new server-side function
          })
          .catch(error => {
            message.textContent = 'Error reading files: ' + error.message;
          });
      });

      function myResult(val) {
        message.innerHTML = 'Files uploaded successfully! ' + val;
      }
