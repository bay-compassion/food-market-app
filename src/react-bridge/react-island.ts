import { createElement, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watchEffect } from 'vue';

/**
 * Wraps a React component so a Vue parent can render it as an ordinary child.
 *
 * This is migration scaffolding, not architecture. It exists so components can move to React from
 * the leaves upward while the app keeps running and shipping, and it is deleted in the pull
 * request that converts `App.vue` — at which point nothing is left to bridge.
 *
 * Two things to know at a call site:
 *
 * - **Props are forwarded verbatim from attributes, so write them in camelCase.** Vue hands
 *   `:first-name="x"` through as the attribute `first-name`, which React would not recognise;
 *   `:firstName="x"` arrives as `firstName`. Listeners need no special handling — Vue's `@click`
 *   is already `onClick` by the time it reaches here.
 * - **Islands take no slot content.** A React root cannot render Vue-owned children, so this is
 *   for leaf components: anything whose children are its own concern. That matches the order the
 *   migration converts components in anyway.
 *
 * The host element is `display: contents` so it is not itself a box: these components sit inside
 * flex and grid containers whose styling addresses direct children, and an extra `<div>` in the
 * layout tree would break that silently.
 */
export function reactIsland<P extends object>(Component: ComponentType<P>) {
	return defineComponent({
		name: `ReactIsland(${Component.displayName ?? Component.name ?? 'Anonymous'})`,
		// Attributes are the props being forwarded, so they must not also land on the host element.
		inheritAttrs: false,
		setup(_props, { attrs }) {
			const host = shallowRef<HTMLElement>();
			let root: Root | null = null;

			onMounted(() => {
				root = createRoot(host.value!);

				// Spreading inside the effect is what subscribes it: reading every key registers the
				// dependency, so a changed prop re-renders the React tree in place.
				watchEffect(() => root?.render(createElement(Component, { ...attrs } as P)));
			});

			onBeforeUnmount(() => {
				root?.unmount();
				root = null;
			});

			return () => h('div', { ref: host, style: { display: 'contents' } });
		},
	});
}
