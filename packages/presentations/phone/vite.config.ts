/**
 * Builds the guest phone (`phone/index.html`) into `out/phone/`, as one page that `build.ts` then
 * inlines into the guest guide (see `frame-vite.ts`).
 *
 * The guest screens' menu imports sign-in and feedback, and the phone has neither a session nor
 * anyone to report to, so both are swapped for stand-ins (see `phone/stubs/`).
 */
import { frameConfig } from '../frame-vite.ts';

export default frameConfig('phone', {
	'auth.ts': 'auth.ts',
	'sentry-feedback-trigger.ts': 'sentry-feedback-trigger.ts',
});
