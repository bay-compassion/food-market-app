import type { ComponentType } from 'react';
import { defineComponent, h, type PropType } from 'vue';

import { reactIsland } from './react-island.ts';

/** What a React component must accept for `v-model` to be adaptable onto it. */
type Controlled<T> = { value: T; onChange: (value: T) => void };

/**
 * Wraps a controlled React component so a Vue parent can drive it with `v-model`.
 *
 * Vue's `v-model` is a `modelValue` prop and an `update:modelValue` event; React's convention is
 * a `value` prop and an `onChange` callback. Translating between them belongs here, in the
 * bridge, rather than in the React component — a component should not carry Vue's naming into a
 * codebase that is leaving Vue. Every call site keeps its `v-model` and needs no edit.
 *
 * Deleted along with the rest of `react-bridge` once no Vue parent renders these.
 */
export function vModelIsland<T extends string | number, P extends Controlled<T>>(
	Component: ComponentType<P>,
) {
	const Island = reactIsland(Component);

	return defineComponent({
		name: `VModelIsland(${Component.displayName ?? Component.name ?? 'Anonymous'})`,
		// Everything but `modelValue` is a prop for the React component, forwarded untouched.
		inheritAttrs: false,
		props: {
			modelValue: {
				// Vue wants runtime constructors; `T` is narrower than what they describe, and the
				// call site is what pins it down.
				type: [String, Number] as unknown as PropType<T>,
				required: true as const,
			},
		},
		emits: { 'update:modelValue': (value: T) => value !== undefined },
		setup(props, { attrs, emit }) {
			return () =>
				h(Island, {
					...attrs,
					value: props.modelValue,
					onChange: (value: T) => emit('update:modelValue', value),
				});
		},
	});
}
