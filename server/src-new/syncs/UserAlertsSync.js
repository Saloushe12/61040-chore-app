// UserAlertsSync
// Spec:
// # sync: UserAlertsSync
// ## when
// Request.getUserAlerts(userId)
// ## then
// returns user’s alert subscriptions
// ## notes
// - Used to render the alerts UI.

const AlertSubscriptionConcept = require('../concepts/AlertSubscriptionConcept');

/**
 * Build a UserAlertsSync function.
 *
 * @param {Object} deps
 * @param {import('../concepts/AlertSubscriptionConcept')} deps.alertConcept
 *
 * @returns {Function} userAlertsSync({ userId }) → { subscriptions }
 */
function buildUserAlertsSync({ alertConcept }) {
  return async function userAlertsSync({ userId }) {
    const subscriptions = await alertConcept._getUserAlerts({ userId });
    return { subscriptions };
  };
}

module.exports = {
  buildUserAlertsSync,
};


