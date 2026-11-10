/** The IPC between the sign-in page's preload and the main process. */
export const signInChannels = {
	/** invoke → `SignInCredential | null`: the saved sign-in, answered only on the sign-in page. */
	saved: 'sign-in:saved',
	/** send(`SubmittedSignIn`): what a sign-in form held when it was submitted. */
	submitted: 'sign-in:submitted',
} as const;

export type SignInCredential = { username: string; password: string };

/**
 * Auth0 asks for the email and the password on separate pages, so each submission carries what its
 * page had: the email alone, or the password with the email when the page repeats it.
 */
export type SubmittedSignIn = { username?: string; password?: string };
