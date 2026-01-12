// js/portals/teachers-portal/sorting-utils.js

/**
 * Sorts an array of learner-like objects alphabetically by surname, then by first name.
 * The sort is done in-place.
 * @param {Array<object>} items - The array of objects to sort. Each object should have `learnerSurname` and `learnerName` properties.
 */
function sortLearnersByName(items) {
    items.sort((a, b) => {
        // Reverted to correct logic after database fix: learnerSurname is the surname.
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