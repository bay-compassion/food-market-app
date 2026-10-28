import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { InstallPlatform } from '../../pwa/install-environment';
import { StaticLDProvider, type StaticFlagValue } from '../StaticLDProvider';
import {
	ANDROID_HOME_SCREEN_INSTALL_FLAG_KEY,
	IOS_HOME_SCREEN_INSTALL_FLAG_KEY,
	useHomeScreenInstallEnabled,
} from './use-home-screen-install-enabled';

describe('useHomeScreenInstallEnabled', () => {
	it.each<[{ android?: StaticFlagValue; ios?: StaticFlagValue }, InstallPlatform, boolean]>([
		[{}, 'android', false],
		[{}, 'ios', false],
		[{ android: true }, 'android', true],
		[{ android: true }, 'ios', false],
		[{ ios: true }, 'ios', true],
		[{ ios: true }, 'android', false],
		[{ android: true, ios: true }, 'android', true],
		[{ android: true, ios: true }, 'ios', true],
		[{ android: true, ios: true }, 'other', false],
		[{ android: 'true', ios: 'true' }, 'ios', false],
	])('evaluates %o for %s as %s', (flags, platform, expected) => {
		// Arrange
		const pinned: Record<string, StaticFlagValue> = {};

		if (flags.android !== undefined) {
			pinned[ANDROID_HOME_SCREEN_INSTALL_FLAG_KEY] = flags.android;
		}

		if (flags.ios !== undefined) {
			pinned[IOS_HOME_SCREEN_INSTALL_FLAG_KEY] = flags.ios;
		}

		// Act
		const { result } = renderHook(() => useHomeScreenInstallEnabled(platform), {
			wrapper: ({ children }) => <StaticLDProvider flags={pinned}>{children}</StaticLDProvider>,
		});

		// Assert
		expect(result.current).toBe(expected);
	});
});
