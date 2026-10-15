/**
 * Builds the admin frame (`admin/index.html`) into `out/admin/`, as one page that `build.ts` then
 * inlines into the admin guide (see `frame-vite.ts`).
 *
 * The dashboard reads the worker's permissions from Auth0, and the app bar's menu offers feedback;
 * the frame signs nobody in and reports to no one, so both are swapped for stand-ins (see
 * `admin/stubs/`).
 */
import { frameConfig } from '../frame-vite.ts';

export default frameConfig('admin', {
	'auth.ts': 'auth.ts',
	'sentry-feedback-trigger.ts': 'sentry-feedback-trigger.ts',
});
