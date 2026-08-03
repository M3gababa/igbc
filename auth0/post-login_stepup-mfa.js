/**
 * Trigger: Post Login (synchronous/blocking)
 *
 * Requires MFA when the client explicitly requests step-up via acr_values, or when the login
 * geolocates to Antarctica (demo-flavor "high risk region" rule).
 */
exports.onExecutePostLogin = async (event, api) => {
  console.log('--- StepUp MFA +++ START');

  // Require MFA if step-up is requested
  if (event.request.query?.acr_values ===
      'http://schemas.openid.net/pape/policies/2007/06/multi-factor') {
    api.multifactor.enable('any');
  }

  // Require MFA for anyone logging in from Antarctica
  if (event.request.geoip?.continentCode === 'AN') {
    api.multifactor.enable('any');
  }

  console.log('--- StepUp MFA +++ END');
};
