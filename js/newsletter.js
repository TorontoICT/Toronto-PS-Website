document.addEventListener('DOMContentLoaded', () => {
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }
});

async function handleNewsletterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const emailInput = document.getElementById('newsletter-email');
    const submitButton = form.querySelector('button[type="submit"]');
    const statusMessage = document.getElementById('newsletter-status');

    if (!emailInput.value) {
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = '...';
    statusMessage.style.display = 'block';
    statusMessage.style.color = '#eef6ff';
    statusMessage.textContent = 'Subscribing...';

    const formData = new FormData(form);
    // IMPORTANT: Replace with your actual Google Apps Script URL for the newsletter.
    // This should be a different script than the one for the main application form.
    const scriptURL = 'https://script.google.com/macros/s/YOUR_NEWSLETTER_SCRIPT_ID/exec';

    try {
        const response = await fetch(scriptURL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }

        const resultText = await response.text();

        if (resultText.toLowerCase().includes('success')) {
            statusMessage.style.color = 'var(--primary-green, #10b981)';
            statusMessage.textContent = 'Success! You are now subscribed.';
            form.reset();
        } else {
            throw new Error(resultText || 'An unknown error occurred.');
        }

    } catch (error) {
        console.error('Newsletter Submission Error:', error);
        statusMessage.style.color = 'var(--accent, #d9534f)';
        statusMessage.textContent = `Error: ${error.message}`;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Subscribe';
        setTimeout(() => { statusMessage.style.display = 'none'; }, 5000);
    }
}