import { makeAutoObservable, type AnnotationsMap } from 'mobx';

/**
 * Makes a store class observable, so reads of its fields and getters are tracked and writes
 * notify whatever is watching.
 *
 * Call it as the last statement of a constructor — MobX only annotates fields that already
 * exist, so anything assigned afterwards would be invisible. The class must not extend another
 * class or be extended, which `makeAutoObservable` rejects outright.
 *
 * `nonObservable` is where a store opts its collaborators out: a `fetch`, a storage service, or
 * another store is a dependency rather than state, and making one observable would wrap it in a
 * proxy for no benefit. Internal bookkeeping that nothing renders — a timer handle, a request
 * revision counter — belongs there too.
 *
 * @param instance - The store to make observable. Returned unchanged; MobX annotates in place.
 * @param nonObservable - Field names to leave alone, as `{ storage: false }`.
 */
export function makeReactive<T extends object>(
	instance: T,
	nonObservable?: Record<string, false>,
): T {
	// MobX types annotations against `keyof T`, which omits the private fields these stores keep
	// their dependencies in. The map only ever turns annotation *off*, so widening it is safe.
	makeAutoObservable(instance, nonObservable as AnnotationsMap<T, never>);

	return instance;
}
