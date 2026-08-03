/**
 * Trigger: Post Login (synchronous/blocking)
 *
 * user_metadata/app_metadata are guarded with `|| {}` — a user can reach post-login with neither
 * set yet (e.g. the pre/post-user-registration RCU actions failed, or the user was created
 * directly via the Management API), and this trigger must not throw on every one of their logins.
 */
exports.onExecutePostLogin = async (event, api) => {
  console.log('--- addClaims_Attributes +++ START');

  const namespace = event.resource_server.identifier;
  const userMetadata = event.user.user_metadata || {};
  const appMetadata = event.user.app_metadata || {};

  /** PERMISSIONS AND ROLES */
  api.accessToken.setCustomClaim('rights', event.authorization?.roles);
  api.accessToken.setCustomClaim('email', event.user.email);

  /** STATIC ATTRIBUTES */
  api.idToken.setCustomClaim(`${namespace}/created_at`, event.user.created_at);
  api.idToken.setCustomClaim(`${namespace}/mongo`, userMetadata.detail);
  api.idToken.setCustomClaim(`${namespace}/id_rcu_france`, appMetadata.id_rcu_france);
  api.idToken.setCustomClaim(`${namespace}/phonenumber`, userMetadata.phonenumber);

  if (userMetadata.address) {
    api.idToken.setCustomClaim(`${namespace}/address/street`, userMetadata.address.street);
    api.idToken.setCustomClaim(`${namespace}/address/city`, userMetadata.address.city);
    api.idToken.setCustomClaim(`${namespace}/address/zipcode`, userMetadata.address.zipcode);
    api.idToken.setCustomClaim(`${namespace}/address/country`, userMetadata.address.country);
    api.idToken.setCustomClaim(`${namespace}/address/planet`, userMetadata.address.planet);
  }

  if (userMetadata.consents) {
    api.idToken.setCustomClaim(`${namespace}/consents/cgu`, userMetadata.consents.cgu);
    api.idToken.setCustomClaim(`${namespace}/consents/gdpr`, userMetadata.consents.gdpr);
    api.idToken.setCustomClaim(`${namespace}/consents/newsletter`, userMetadata.consents.newsletter);
  }

  /** ORGANIZATION ATTRIBUTES */
  if (event.organization?.metadata) {
    api.accessToken.setCustomClaim('org_name', event.organization.name);
    api.idToken.setCustomClaim(`${namespace}/orgName`, event.organization.metadata.full_name);
    api.idToken.setCustomClaim(`${namespace}/orgOwner`, event.organization.metadata.leader);
    api.idToken.setCustomClaim(`${namespace}/orgContact`, event.organization.metadata.contact);
  }

  /** UPDATE USER PROFILE */
  if (event.request.geoip) {
    api.user.setUserMetadata('last_login_country', event.request.geoip.countryName);
    api.user.setUserMetadata('last_login_city', event.request.geoip.cityName);
  }

  console.log('--- addClaims_Attributes +++ END');
};
