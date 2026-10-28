import { useBoolVariation } from '@launchdarkly/react-sdk';

import type { InstallPlatform } from '../../pwa/install-environment';

export const ANDROID_HOME_SCREEN_INSTALL_FLAG_KEY = 'guest-home-screen-install-android';
export const IOS_HOME_SCREEN_INSTALL_FLAG_KEY = 'guest-home-screen-install-ios';

/** Independent mobile rollouts; missing flags and an unavailable client both mean off. */
export function useHomeScreenInstallEnabled(platform: InstallPlatform): boolean {
	const android = useBoolVariation(ANDROID_HOME_SCREEN_INSTALL_FLAG_KEY, false);
	const ios = useBoolVariation(IOS_HOME_SCREEN_INSTALL_FLAG_KEY, false);

	return (platform === 'android' && android) || (platform === 'ios' && ios);
}
