import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { InstallPlatform } from '../../pwa/install-environment';
import { StaticLDProvider, type StaticFlagValue } from '../StaticLDProvider';
import {
	HOME_SCREEN_INSTALL_FLAG_KEY,
	useHomeScreenInstallEnabled,
} from './use-home-screen-install-enabled';

describe('useHomeScreenInstallEnabled', () => {
	it.each<[StaticFlagValue | undefined, InstallPlatform, boolean]>([
		[undefined, 'android', false],
		[undefined, 'ios', false],
		[true, 'android', true],
		[true, 'ios', true],
		[false, 'android', false],
		[false, 'ios', false],
		[true, 'other', false],
		['true', 'ios', false],
	])('evaluates the shared flag %s for %s as %s', (flag, platform, expected) => {
		// Arrange
		const pinned: Record<string, StaticFlagValue> =
			flag === undefined ? {} : { [HOME_SCREEN_INSTALL_FLAG_KEY]: flag };

		// Act
		const { result } = renderHook(() => useHomeScreenInstallEnabled(platform), {
			wrapper: ({ children }) => <StaticLDProvider flags={pinned}>{children}</StaticLDProvider>,
		});

		// Assert
		expect(result.current).toBe(expected);
	});
});
