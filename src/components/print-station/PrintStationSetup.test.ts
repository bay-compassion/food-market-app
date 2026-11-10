import { describe, expect, it } from 'vitest';

import launcherScript from '../../../docs/check-in-launcher/launch.sh?raw';
import { printStationLaunchCommand, printStationFirstRunCommand } from './PrintStationSetup';

describe('print station commands', () => {
	it('starts the Check-In Launcher with every flag of the launch command', () => {
		// Arrange
		const flags = printStationLaunchCommand.match(/--[a-z-]+/g) ?? [];

		// Act
		const missing = flags.filter((flag) => !launcherScript.includes(flag));

		// Assert
		expect(flags).toContain('--kiosk-printing');
		expect(missing).toEqual([]);
	});

	it('leaves the print dialog on for first-time setup', () => {
		// Arrange
		const silent = '--kiosk-printing ';

		// Act
		const setup = printStationFirstRunCommand;

		// Assert
		expect(setup).toBe(printStationLaunchCommand.replace(silent, ''));
	});
});
