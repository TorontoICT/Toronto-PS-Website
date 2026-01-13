// announcements.js

// Firebase config moved to js/shared/firebase-config.js
const db = firebase.firestore();
const announcementsCollection = db.collection('announcements');

const announcementsList = document.getElementById('announcements-list');

// Function to format the date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

// Function to render announcements
const renderAnnouncements = (announcements) => {
  // Check if the element exists before clearing/populating
  if (!announcementsList) return; 
    
  announcementsList.innerHTML = ''; // Clear existing announcements

  if (announcements.length === 0) {
    announcementsList.innerHTML = '<p>No announcements to display at this time.</p>';
    return;
  }

  announcements.forEach(doc => {
    const data = doc.data();
    const announcementItem = document.createElement('div');
    announcementItem.classList.add('content-item', 'announcement-item');
    
    announcementItem.innerHTML = `
      <h2>${data.title}</h2>
      <p class="announcement-date">${formatDate(data.date)}</p>
      <p>${data.content.replace(/\n/g, '<br>')}</p>
    `;
    
    announcementsList.appendChild(announcementItem);
  });
};

// Real-time listener for announcements
// Only attach the listener if the target container is present on the page
if (announcementsList) {
    announcementsCollection.orderBy('date', 'desc').onSnapshot(snapshot => {
        const announcements = [];
        snapshot.forEach(doc => {
            announcements.push(doc);
        });
        renderAnnouncements(announcements);
    }, err => {
        console.error('Error fetching announcements:', err);
        // Check if the element still exists before updating content
        if (announcementsList) {
            announcementsList.innerHTML = '<p>Failed to load announcements. Please try again later.</p>';
        }
    });
}

const DEFAULT_INTERVAL = 4000;
const DEFAULT_WAIT_TIMEOUT = 15000;

function waitForItems(container, selector = '.announcement-item', timeout = DEFAULT_WAIT_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const existing = container.querySelectorAll(selector);
        if (existing.length) return resolve(Array.from(existing));

        const observer = new MutationObserver((mutations) => {
            const found = container.querySelectorAll(selector);
            if (found.length) {
                observer.disconnect();
                return resolve(Array.from(found));
            }
        });

        observer.observe(container, { childList: true, subtree: true });

        if (timeout > 0) {
            const t = setTimeout(() => {
                observer.disconnect();
                reject(new Error('Timed out waiting for announcement items'));
            }, timeout);
        }
    });
}

function buildCarouselStructure(listEl) {
    const items = Array.from(listEl.querySelectorAll('.announcement-item'));
    if (items.length === 0) return null;

    // create carousel DOM
    const carousel = document.createElement('div');
    carousel.className = 'carousel-container';
    carousel.setAttribute('aria-roledescription', 'carousel');

    const track = document.createElement('div');
    track.className = 'carousel-track';
    carousel.appendChild(track);

    items.forEach((item, i) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-label', `Announcement ${i + 1} of ${items.length}`);
        slide.appendChild(item); // moves item into slide
        track.appendChild(slide);
    });

    // create indicators (dots)
    const indicators = document.createElement('div');
    indicators.className = 'carousel-indicators';
    indicators.setAttribute('role', 'tablist');
    indicators.setAttribute('aria-label', 'Announcement indicators');

    Array.from(track.children).forEach((_, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = i === 0 ? 'active' : '';
        btn.setAttribute('aria-label', `Show announcement ${i + 1}`);
        btn.setAttribute('aria-current', i === 0 ? 'true' : 'false');
        btn.dataset.index = String(i);
        indicators.appendChild(btn);
    });

    // clear original and append carousel + indicators
    listEl.innerHTML = '';
    listEl.appendChild(carousel);
    listEl.appendChild(indicators);

    return { carousel, track, slides: Array.from(track.children), indicators };
}

function createAutoPlayController(carouselEl, trackEl, slides, indicatorsEl, intervalMs = DEFAULT_INTERVAL) {
    let index = 0;
    let timer = null;
    let resumeTimeout = null;

    const indicatorButtons = indicatorsEl ? Array.from(indicatorsEl.querySelectorAll('button')) : [];

    const canAutoplay = () => trackEl.scrollWidth > carouselEl.clientWidth;

    function updateIndicators(idx) {
        if (!indicatorButtons.length) return;
        indicatorButtons.forEach((b, i) => {
            const active = i === idx;
            b.classList.toggle('active', active);
            b.setAttribute('aria-current', active ? 'true' : 'false');
        });
    }

    // Move the track using transform for a smooth animated slide.
    // If smooth === false, temporarily disable transition to jump instantly.
    function goTo(idx, smooth = true) {
        if (!slides.length) return;
        idx = ((idx % slides.length) + slides.length) % slides.length;
        index = idx;

        const slide = slides[index];
        // compute left offset of the slide relative to the track's left
        const left = slide.offsetLeft - trackEl.offsetLeft;

        if (!smooth) {
            // disable transition, set transform, then force reflow and restore transition
            const prevTransition = trackEl.style.transition;
            trackEl.style.transition = 'none';
            trackEl.style.transform = `translateX(-${left}px)`;
            // force reflow
            // eslint-disable-next-line no-unused-expressions
            trackEl.offsetHeight;
            trackEl.style.transition = prevTransition || 'transform 600ms cubic-bezier(.22,.98,.38,.99)';
        } else {
            trackEl.style.transform = `translateX(-${left}px)`;
        }

        updateIndicators(index);
    }

    function next() { goTo(index + 1, true); }

    function start() {
        if (timer || !canAutoplay()) return;
        timer = setInterval(next, intervalMs);
    }

    function stop() {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
    }

    // wire indicator clicks
    if (indicatorButtons.length) {
        indicatorButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const idx = Number((e.currentTarget).dataset.index || 0);
                goTo(idx, true);
                stop();
                clearTimeout(resumeTimeout);
                resumeTimeout = setTimeout(start, 3000);
            });
        });
    }

    // pause/resume on hover/focus
    carouselEl.addEventListener('mouseenter', stop);
    carouselEl.addEventListener('mouseleave', start);
    carouselEl.addEventListener('focusin', stop);
    carouselEl.addEventListener('focusout', start);

    const userInteracted = () => {
        stop();
        clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(start, 3000);
    };
    carouselEl.addEventListener('wheel', userInteracted, { passive: true });
    carouselEl.addEventListener('touchstart', userInteracted, { passive: true });

    // Synchronize index if something else manipulates track transform/position
    // (we no longer rely on container scroll events)
    // Ensure first slide is visible instantly on init, then start autoplay
    goTo(0, false);
    const initialStartDelay = 800;
    setTimeout(start, initialStartDelay);

    const onResize = () => { 
        // recompute position for the current index after layout changes
        goTo(index, false);
        stop();
        start();
    };
    window.addEventListener('resize', onResize);

    return {
        start, stop, goTo,
        destroy() {
            stop();
            window.removeEventListener('resize', onResize);
            const clone = trackEl.cloneNode(true);
            trackEl.parentNode.replaceChild(clone, trackEl);
        }
    };
}

/**
 * Initialize carousel for announcements.
 * - selector: container selector, default '#announcements-list'
 * - options: { intervalMs, waitTimeout }
 * Returns a Promise resolving to controller { start, stop, goTo, destroy } or null if no items.
 */
export async function initAnnouncementsCarousel(selector = '#announcements-list', options = {}) {
    const { intervalMs = DEFAULT_INTERVAL, waitTimeout = DEFAULT_WAIT_TIMEOUT } = options;
    const list = document.querySelector(selector);
    if (!list) return null;

    try {
        await waitForItems(list, '.announcement-item', waitTimeout);
    } catch (err) {
        // no items arrived within timeout
        return null;
    }

    const structure = buildCarouselStructure(list);
    if (!structure) return null;

    const controller = createAutoPlayController(structure.carousel, structure.track, structure.slides, structure.indicators, intervalMs);
    return controller;
}

// attach convenience helper to window for non-module callers
window.initAnnouncementsCarousel = initAnnouncementsCarousel;

// auto-init on DOMContentLoaded (useful when announcements are rendered server-side or already present)
document.addEventListener('DOMContentLoaded', () => {
    // attempt auto-init but don't block if items will be injected later by your Firestore code
    initAnnouncementsCarousel('#announcements-list').catch(() => {});
});