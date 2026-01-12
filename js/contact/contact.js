// contact.js
// ================================================
// === GOOGLE APPS SCRIPT CONTACT FORM SUBMISSION ===
// ================================================

// This is the URL of your deployed Google Apps Script.
const scriptURL = 'https://script.google.com/macros/s/AKfycbwVSH-t7831ixuLZN5ekD0ST5EMWrySnc4Rj7pJCfRw8HwZaq0XWGzu4M1EnlHgzC3N/exec'; 

const contactForm = document.querySelector('.contact-form');
const contactFormContainer = document.querySelector('.contact-form-container');

if (contactForm && contactFormContainer) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Show a temporary "Sending" message to the user
    contactFormContainer.innerHTML = `
      <div class="message-status">
        <h2>Sending your message...</h2>
        <p>Please wait a moment. Do not close this page.</p>
      </div>
    `;

    const formData = new FormData(contactForm);

    try {
      const response = await fetch(scriptURL, {
        method: 'POST',
        body: formData,
        redirect: 'follow' // Important for successful redirects from GAS
      });

      // Check if the response is successful
      if (response.status === 200) {
        const result = await response.text();
        if (result.includes("success")) {
          // Display success message
          contactFormContainer.innerHTML = `
            <div class="message-status success-message">
              <h2>Message Sent Successfully!</h2>
              <p>Thank you for contacting us. We will get back to you as soon as possible.</p>
              <p><a href="contact.html">Send another message</a></p>
            </div>
          `;
        } else {
          throw new Error('Google Apps Script returned an error.');
        }
      } else {
        throw new Error('Response was not OK.');
      }

    } catch (error) {
      // Display error message
      contactFormContainer.innerHTML = `
        <div class="message-status error-message">
          <h2>Error Sending Message</h2>
          <p>An error occurred while sending your message. Please try again later.</p>
          <p><a href="contact.html">Try Again</a></p>
        </div>
      `;
      console.error('Error:', error);
    }
  });
}