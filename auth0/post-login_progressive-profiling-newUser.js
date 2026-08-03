/**
 * Trigger: Post Login (synchronous/blocking)
 *
 * Renders the progressive-profiling Form if and only if the user does not have the
 * "IGBC - Customer" role yet — i.e. keeps prompting until they've completed onboarding.
 */
const CUSTOMER_ROLE = 'IGBC - Customer';
const PROGRESSIVE_PROFILING_FORM_ID = 'ap_aNvo3mBfAwXULxC3sMSC18';

exports.onExecutePostLogin = async (event, api) => {
  console.log('--- triggerForm_ProgressiveProfiling +++ START');

  const isNotCustomer = (!event.authorization?.roles?.includes(CUSTOMER_ROLE)) || (event.request.query.custom_param==="newCustomer");

  if (isNotCustomer) {
    api.prompt.render(PROGRESSIVE_PROFILING_FORM_ID);
  }

  console.log('--- triggerForm_ProgressiveProfiling +++ END');
};

exports.onContinuePostLogin = async (event, api) => {
  console.log('--- continueForm_ProgressiveProfiling +++ START');

  // No post-form logic yet.

  console.log('--- continueForm_ProgressiveProfiling +++ END');
};
