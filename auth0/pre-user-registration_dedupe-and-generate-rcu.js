/**
 * Trigger: Pre User Registration (synchronous/blocking)
 *
 * Dependencies to add in the Auth0 dashboard (Action editor -> Dependencies): mongodb
 * Secrets to add in the Auth0 dashboard (Action editor -> Secrets):
 *   MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_DOMAIN, MONGODB_DATABASE
 *   (same values as api/.env's MONGODB_* vars)
 */
exports.onExecutePreUserRegistration = async (event, api) => {
  console.log('--- dedupeUser_GenerateRCU +++ START');

  const { MongoClient } = require('mongodb');
  const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_DOMAIN, MONGODB_DATABASE } = event.secrets;
  const uri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_DOMAIN}/${MONGODB_DATABASE}?retryWrites=true&w=majority`;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const users = client.db(MONGODB_DATABASE).collection('users');
    const existing = await users.findOne({ email: event.user.email });

    if (existing) {
      api.access.deny('duplicate-email', 'An account with this email already exists.');
      return;
    }

    // 8-digit RCU (RCU France demo identifier). No uniqueness check against
    // other RCUs — demo tenant, capped at ~50 users, collision odds are negligible.
    const rcuId = String(Math.floor(10000000 + Math.random() * 90000000));

    // Read by the post-login action as `${namespace}/id_rcu_france` on the ID token.
    api.user.setAppMetadata('id_rcu_france', rcuId);
  } catch (err) {
    console.log('pre-user-registration-dedupe-and-generate-rcu error:', err);
    api.validation.error('mongo-lookup-failed', 'Unable to verify account eligibility. Please try again.');
  } finally {
    await client.close();
    console.log('--- dedupeUser_GenerateRCU +++ END');
  }
};
