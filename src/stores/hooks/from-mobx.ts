import { reaction } from 'mobx';
import { computed, onScopeDispose, shallowRef, type ComputedRef } from 'vue';

/**
 * A `computed` that also re-evaluates when the MobX state it reads changes.
 *
 * Vue's own `computed` caches against Vue's dependency graph, which knows nothing about MobX
 * observables, so a derivation over a store would compute once and then never again. This keeps
 * both systems honest: `read` runs inside a Vue computed, so Vue tracks any refs it touches,
 * while a MobX reaction over the same function bumps a version ref to invalidate that cache when
 * an observable changes. Derivations that mix the two — most of them, since a label usually
 * combines store state with a local ref — stay correct.
 *
 * This is migration scaffolding. Once no Vue component reads a store, it and its callers go.
 */
export function fromMobx<T>(read: () => T): ComputedRef<T> {
	const version = shallowRef(0);

	// Reading `read()` here is what registers the Vue-side dependencies; touching `version` is
	// what lets the MobX reaction below invalidate this cache.
	const value = computed(() => {
		void version.value;

		return read();
	});

	onScopeDispose(
		reaction(read, () => {
			version.value += 1;
		}),
	);

	return value;
}
