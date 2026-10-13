/**
 * Browser storage that lives only as long as the object does, for a story that seeds what a phone
 * remembers. Stories on a docs page share one `window`, so seeding `localStorage` would leak from
 * one story into the next.
 */
export class MemoryStorage implements Storage {
	private readonly values = new Map<string, string>();

	get length() {
		return this.values.size;
	}

	clear() {
		this.values.clear();
	}

	getItem(key: string) {
		return this.values.get(key) ?? null;
	}

	key(index: number) {
		return Array.from(this.values.keys())[index] ?? null;
	}

	removeItem(key: string) {
		this.values.delete(key);
	}

	setItem(key: string, value: string) {
		this.values.set(key, value);
	}
}
