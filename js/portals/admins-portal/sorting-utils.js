// js/portals/admins-portal/sorting-utils.js

/**
 * Sorts an array of learner-like objects alphabetically by surname, then by first name.
 * @param {Array<object>} items - The array of objects to sort. Each object should have `learnerSurname` and `learnerName` properties.
 */
function sortLearnersByName(items) {
    items.sort((a, b) => {
        const surnameCompare = (a.learnerSurname || '').localeCompare(b.learnerSurname || '');
        if (surnameCompare !== 0) return surnameCompare;
        return (a.learnerName || '').localeCompare(b.learnerName || '');
    });
}

/**
 * Formats a learner's name as "Surname Firstname".
 * @param {object} learner - The learner object with learnerSurname and learnerName properties.
 * @returns {string} The formatted name.
 */
function formatLearnerName(learner) {
    return `${learner.learnerSurname || ''} ${learner.learnerName || ''}`.trim();
}