import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { app, safeStorage } from 'electron';

import type { SignInCredential } from '../shared/sign-in.ts';

/**
 * The one sign-in the app remembers: the shared check-in account's email and password.
 *
 * Encrypted with `safeStorage`, whose key macOS keeps in the login Keychain as "<app name> Safe
 * Storage", so the file in the app's data folder is unreadable without that Keychain. Ad hoc signing
 * changes with every build, so the first time a new build reads it, macOS asks whether the app may
 * use that Keychain item; choose Always Allow.
 */
export class SavedSignIn {
	private readonly file = path.join(app.getPath('userData'), 'sign-in.bin');

	get exists(): boolean {
		return existsSync(this.file);
	}

	load(): SignInCredential | null {
		if (!this.exists || !safeStorage.isEncryptionAvailable()) {
			return null;
		}

		try {
			const value: unknown = JSON.parse(safeStorage.decryptString(readFileSync(this.file)));

			return isSignInCredential(value) ? value : null;
		} catch {
			// Denied in the Keychain prompt, or written under a key that is gone.
			return null;
		}
	}

	save(credential: SignInCredential): void {
		writeFileSync(this.file, safeStorage.encryptString(JSON.stringify(credential)), {
			mode: 0o600,
		});
	}

	forget(): void {
		rmSync(this.file, { force: true });
	}
}

function isSignInCredential(value: unknown): value is SignInCredential {
	return (
		typeof value === 'object' &&
		value !== null &&
		'username' in value &&
		'password' in value &&
		typeof value.username === 'string' &&
		typeof value.password === 'string'
	);
}
