/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
	// Prefer a given name. Username/password users often have their email address in `name`,
	// and an email is not what a volunteer should see on another volunteer's screen.
	const name = [event.user.given_name, event.user.name].find(
		(value) => typeof value === 'string' && value.trim() && !value.includes('@'),
	);

	if (name) {
		api.accessToken.setCustomClaim('https://thebaycompassion.org/claims/name', name.trim());
	}
};

/**
 * Handler that will be invoked when this action is resuming after an external redirect. If your
 * onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
// exports.onContinuePostLogin = async (event, api) => {
// };
