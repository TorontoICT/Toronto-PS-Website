/**
 * Sets up the single-page navigation for the portal.
 */
export function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar a[href^="#"], a.block[href^="#"]');
    // Handle clicks on sidebar links
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            history.pushState(null, null, `#${targetId}`);
            showSection(targetId);
        });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        const targetId = window.location.hash.substring(1) || 'dashboard';
        showSection(targetId);
    });

    // Show initial section based on URL hash
    const initialTargetId = window.location.hash.substring(1) || 'dashboard';
    showSection(initialTargetId);
}

/**
 * Hides all portal sections and shows the one with the specified ID.
 * @param {string} targetId The ID of the section to show.
 */
export function showSection(targetId) {
    const sections = document.querySelectorAll('.portal-section');
    const navLinks = document.querySelectorAll('.sidebar a[href^="#"]');

    // Hide all sections
    sections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active-section');
    });

    // Show the target section
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.add('active-section');
        targetSection.style.display = 'block';
    }

    // Update active link in sidebar
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${targetId}`) {
            link.classList.add('active');
        }
    });
}

/**
 * Sets up the responsive sidebar toggle for mobile view.
 */
export function setupResponsiveSidebar() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const contentWrapper = document.querySelector('.portal-content-wrapper');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('is-open');
            contentWrapper.classList.toggle('overlay-active');
        });
    }

    if (contentWrapper) {
        contentWrapper.addEventListener('click', () => {
            if (sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
                contentWrapper.classList.remove('overlay-active');
            }
        });
    }
}