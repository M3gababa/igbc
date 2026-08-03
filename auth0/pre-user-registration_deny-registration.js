/**
 * Trigger: Pre User Registration (synchronous/blocking)
 *
 * Blocks signup from a disposable email domain, or from North Korea (localized error message).
 */
const BLOCKED_EMAIL_DOMAINS = ['yopmail.com'];

exports.onExecutePreUserRegistration = async (event, api) => {
  console.log('--- DenyRegistration +++ START');

  const emailDomain = event.user.email?.split('@')[1]?.toLowerCase();

  if (emailDomain && BLOCKED_EMAIL_DOMAINS.includes(emailDomain)) {
    api.access.deny(
      'disposable-email-domain',
      'This email provider is not allowed. Please sign up with a different email address.',
    );
    console.log('--- DenyRegistration +++ END');
    return;
  }

  if (event.request.geoip?.countryName === 'North Korea') {
    // localize the error message
    const LOCALIZED_MESSAGES = {
      en: 'You are not allowed to register.',
      es: 'No tienes permitido registrarte.',
      fr: 'Vous ne pouvez pas creer de compte.',
    };

    const userMessage =
      LOCALIZED_MESSAGES[event.request.language] || LOCALIZED_MESSAGES['en'];
    api.access.deny('no_signups_from_north_korea', userMessage);
  }

  console.log('--- DenyRegistration +++ END');
};
