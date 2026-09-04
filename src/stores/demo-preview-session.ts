import type { DemoGuest } from '../services/demo-preview';
import { StorageKey, StorageService } from '../services/storage.service';

export const previewMarker = 'bay-compassion.demo-preview';
const prefix = 'bay-compassion.demo-preview:';

/** A guest tab has the normal storage contract, scoped entirely to its own session. */
export class DemoPreviewSession implements Storage {
	constructor(private readonly backing: Storage = window.sessionStorage) {}
	get length(): number {
		return this.keys.length;
	}
	private get keys(): string[] {
		return Array.from({ length: this.backing.length }, (_, index) =>
			this.backing.key(index),
		).filter((key): key is string => key?.startsWith(prefix) === true);
	}
	key(index: number): string | null {
		return this.keys[index]?.slice(prefix.length) ?? null;
	}
	getItem(key: string): string | null {
		return this.backing.getItem(prefix + key);
	}
	setItem(key: string, value: string): void {
		this.backing.setItem(prefix + key, value);
	}
	removeItem(key: string): void {
		this.backing.removeItem(prefix + key);
	}
	clear(): void {
		for (const key of this.keys) {
			this.backing.removeItem(key);
		}
	}
	seed(guest: DemoGuest): void {
		this.clear();
		const storage = new StorageService(this);

		storage.set(StorageKey.GUEST_DEVICE_TOKEN, guest.deviceToken);
		storage.set(StorageKey.GUEST_IDENTITY, {
			firstName: guest.firstName,
			lastName: guest.lastName,
			phone: guest.phone,
		});
		storage.set(StorageKey.RETURNING_VISITOR, true);

		if (guest.household) {
			storage.set(StorageKey.GUEST_HOUSEHOLD, guest.household);
		}

		if (guest.visit) {
			this.setItem('bay-compassion.visit-token', guest.visit.token);
		}
		this.setItem(StorageKey.LOCALE, guest.locale);
		this.backing.setItem(previewMarker, `${guest.firstName} ${guest.lastName}`);
	}
	end(): void {
		this.clear();
		this.backing.removeItem(previewMarker);
	}
	static open(guest: DemoGuest): boolean {
		const tab = window.open('about:blank', '_blank');

		if (!tab) {
			return false;
		}

		try {
			// A newly opened tab inherits session storage. Remove the copied admin roster and
			// any other guest's credentials before installing only this guest's state.
			tab.sessionStorage.clear();
			new DemoPreviewSession(tab.sessionStorage).seed(guest);
			tab.opener = null;
			tab.location.replace(window.location.origin + '/');

			return true;
		} catch {
			tab.close();

			return false;
		}
	}
}
