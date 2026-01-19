// js/portals/teachers-portal/sorting-utils.js

/**
 * Sorts an array of learner-like objects alphabetically by surname, then by first name.
 * The sort is done in-place.
 * @param {Array<object>} items - The array of objects to sort. Each object should have `learnerSurname` and `learnerName` properties.
 */
function sortLearnersByName(items) {
    items.sort((a, b) => {
        // Reverted to correct logic after database fix: learnerName is the name.
        const nameCompare = (a.learnerName || '').localeCompare(b.learnerName|| '');
        if (nameCompare !== 0) return nameCompare;
        return (a.learnerSurname || '').localeCompare(b.learnerSurname || '');
    });
}

/**
 * Formats a learner's name as "Surname Firstname".
 * @param {object} learner - The learner object with learnerSurname and learnerName properties.
 * @returns {string} The formatted name.
 */
function formatLearnerName(learner) {
    return `${learner.learnerName || ''} ${learner.learnerSurname || ''}`.trim();
}