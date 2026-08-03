/**
 * Trigger: Post User Registration (asynchronous/non-blocking)
 *
 * Runs after the user record exists in Auth0, so event.user.user_id and
 * event.user.app_metadata (set by pre-user-registration-dedupe-and-generate-rcu.js)
 * are both available here. Non-blocking: a failure here does not affect the
 * signup transaction and is only visible in the Action's own logs.
 *
 * Dependencies to add in the Auth0 dashboard (Action editor -> Dependencies): mongodb
 * Secrets to add in the Auth0 dashboard (Action editor -> Secrets):
 *   MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_DOMAIN, MONGODB_DATABASE
 *   (same values as api/.env's MONGODB_* vars)
 */
exports.onExecutePostUserRegistration = async (event) => {
  console.log('--- createMongoUser_PostRegistration +++ START');

  const { MongoClient } = require('mongodb');
  const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_DOMAIN, MONGODB_DATABASE } = event.secrets;
  const uri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_DOMAIN}/${MONGODB_DATABASE}?retryWrites=true&w=majority`;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const users = client.db(MONGODB_DATABASE).collection('users');
    const now = new Date();

    await users.insertOne({
      authId: event.user.user_id,
      email: event.user.email,
      name: event.user.email.split('@')[0],
      rcuId: event.user.app_metadata?.id_rcu_france ?? null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    console.log('post-user-registration-create-mongo-user error:', err);
  } finally {
    await client.close();
    console.log('--- createMongoUser_PostRegistration +++ END');
  }
};
