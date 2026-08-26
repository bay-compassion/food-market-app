import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';
import { ref } from 'vue';

import AppButton from '../AppButton.vue';
import Dialog from './Dialog.vue';

type DialogArgs = {
	title: string;
	closeLabel: string;
};

const meta: Meta<DialogArgs> = {
	title: 'Primitives/Dialog',
	component: Dialog,
	tags: ['autodocs'],
	parameters: { shell: 'bare' },
	args: {
		title: 'Dialog title',
		closeLabel: 'Close dialog',
	},
	render: (args) => ({
		components: { AppButton, Dialog },
		setup() {
			return { args, open: ref(false) };
		},
		template: `
			<AppButton type="button" @click="open = true">Open dialog</AppButton>
			<Dialog
				:open="open"
				:title="args.title"
				:close-label="args.closeLabel"
				@close="open = false"
			>
				<p>Dialog content can contain forms, messages, or other focused tasks.</p>
				<template #actions><AppButton type="button">Continue</AppButton></template>
			</Dialog>
		`,
	}),
};

export default meta;
type Story = StoryObj<DialogArgs>;

export const Default: Story = {
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();

		await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));

		await expect(await canvas.findByRole('dialog')).toBeInTheDocument();
		await expect(canvas.getByRole('heading', { name: 'Dialog title' })).toBeInTheDocument();
	},
};
