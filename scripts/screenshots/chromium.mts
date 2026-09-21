import { chromium, type Browser } from 'playwright';

/**
 * The pinned Playwright build is not downloadable everywhere this script needs to run — an offline
 * CI image, or a sandbox that ships its own Chromium — so `CHROMIUM_EXECUTABLE_PATH` names the
 * browser to use instead. Unset, Playwright resolves its own as usual.
 */
export function launchChromium(): Promise<Browser> {
	return chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
}
