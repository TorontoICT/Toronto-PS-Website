// ===============================================
// === GOOGLE APPS SCRIPT FORM SUBMISSION ===
// ===============================================

const applicationForm = document.getElementById('application-form');
const mainContentSection = document.getElementById('main-content');
// Use the new, single URL you just deployed
const scriptURL = 'https://script.google.com/macros/s/AKfycbyYCBiHB7oaAchC--LfvJhpAOqOOqVNYtsd90-2g4gHp1LHzkz_7lhrMMvVaD41Pmyr3g/exec';

if (applicationForm && mainContentSection) {
  applicationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Display a temporary "submitting" message.
    mainContentSection.innerHTML = `
      <div class="confirmation-message">
        <h2>Submitting your application...</h2>
        <p>Please wait a moment. Do not close this page.</p>
      </div>
    `;

    try {
      const formData = new FormData(applicationForm);
      const response = await fetch(scriptURL, { method: 'POST', body: formData });

      if (response.ok) {
        // Upon successful submission, replace content with the confirmation message.
        mainContentSection.innerHTML = `
          <div class="confirmation-message">
            <h2>Application Submitted Successfully!</h2>
            <p>Thank you for submitting your application. Your information has been received.</p>
            <p>Please use the link below to submit your supporting documents.</p>
            <a href="${scriptURL}">Submit Supporting Documents</a>
          </div>
        `;
      } else {
        // Handle error from the Google Apps Script.
        const errorText = await response.text();
        mainContentSection.innerHTML = `
          <div class="confirmation-message">
            <h2>Submission Failed</h2>
            <p>An error occurred while submitting your application. Please try again later. Error: ${errorText}</p>
            <a href="application-form.html">Try Again</a>
          </div>
        `;
      }
    } catch (error) {
      // Handle network or other errors.
      mainContentSection.innerHTML = `
        <div class="confirmation-message">
          <h2>Submission Failed</h2>
          <p>A network error occurred. Please check your internet connection and try again.</p>
          <a href="application-form.html">Try Again</a>
        </div>
      `;
      console.error('Error:', error);
    }
  });
}