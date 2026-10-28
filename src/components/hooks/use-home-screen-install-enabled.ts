import { useBoolVariation } from '@launchdarkly/react-sdk';

import type { InstallPlatform } from '../../pwa/install-environment';

export const HOME_SCREEN_INSTALL_FLAG_KEY = 'guest-home-screen-install';

/** LaunchDarkly targets the anonymous context's os attribute; desktop browsers stay excluded. */
export function useHomeScreenInstallEnabled(platform: InstallPlatform): boolean {
	const enabled = useBoolVariation(HOME_SCREEN_INSTALL_FLAG_KEY, false);

	return platform !== 'other' && enabled;
}
