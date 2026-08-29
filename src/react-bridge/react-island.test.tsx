import styled from '@emotion/styled';
import { act, render, screen } from '@testing-library/react';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';

import { reactIsland } from './react-island';

/**
 * Proves the React toolchain end to end while the app is still Vue: SWC compiles the JSX, Emotion
 * styles it, React renders it, and `reactIsland` mounts it inside a Vue parent.
 */

const Badge = styled.span`
	color: rgb(2, 57, 64);
`;

function Greeting({ name }: { name: string }) {
	return <Badge>Hello, {name}</Badge>;
}

const GreetingIsland = reactIsland(Greeting);

/**
 * Draining Vue's queue is enough: `onMounted` creates the React root and the island flushes the
 * render synchronously, so there is no later React tick to wait for. `act` is still used to keep
 * React from warning about updates outside it.
 */
async function settle() {
	await act(async () => {
		await flushPromises();
	});
}

/** Lets a test change the prop a Vue parent passes down, to check the island re-renders. */
function hostWithName(initial: string) {
	const name = ref(initial);
	const wrapper = mount(
		defineComponent({
			setup: () => () => h('div', [h(GreetingIsland, { name: name.value })]),
		}),
	);

	return { wrapper, name };
}

describe('React toolchain', () => {
	it('compiles JSX and applies Emotion styles', () => {
		// Arrange & Act
		render(<Greeting name="Ada" />);

		// Assert
		const badge = screen.getByText(/Hello/);

		expect(badge).toHaveProperty('tagName', 'SPAN');
		// Emotion generates a class rather than an inline style; its presence is the proof.
		expect(badge.className).toMatch(/css-/);
	});
});

describe('reactIsland', () => {
	it('renders a React component inside a Vue parent', async () => {
		// Arrange
		const { wrapper } = hostWithName('Ada');

		// Act
		await settle();

		// Assert
		expect(wrapper.text()).toContain('Hello, Ada');
	});

	it('re-renders when the Vue parent changes a prop', async () => {
		// Arrange
		const { wrapper, name } = hostWithName('Ada');

		await settle();

		// Act
		name.value = 'Grace';
		await settle();

		// Assert
		expect(wrapper.text()).toContain('Hello, Grace');
		expect(wrapper.text()).not.toContain('Ada');
	});

	it('leaves no host box in the layout tree', async () => {
		// Arrange
		const { wrapper } = hostWithName('Ada');

		// Act
		await settle();

		// Assert — a plain wrapper div would break the flex and grid parents these sit inside.
		const host = wrapper.element.firstElementChild as HTMLElement;

		expect(host.style.display).toBe('contents');
	});

	it('renders synchronously with its Vue parent', () => {
		// Arrange & Act — no flush at all: the island commits during mount, which is what lets the
		// Vue tests around it await Vue's queue and nothing more.
		const { wrapper } = hostWithName('Ada');

		// Assert
		expect(wrapper.text()).toContain('Hello, Ada');
	});

	it('unmounts the React root with its Vue parent', async () => {
		// Arrange
		const { wrapper } = hostWithName('Ada');

		await settle();

		// Act
		wrapper.unmount();
		await settle();

		// Assert
		expect(wrapper.html()).not.toContain('Hello');
	});
});
