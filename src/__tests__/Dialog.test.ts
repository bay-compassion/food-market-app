import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ref } from 'vue';

import Dialog from '../components/ui/Dialog.vue';

let showModal: Mock<(this: HTMLDialogElement) => void>;

beforeEach(() => {
	showModal = vi.fn(function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
	});
	HTMLDialogElement.prototype.showModal = showModal;
});

describe('Dialog', () => {
	it('does not mount or activate until opened', async () => {
		const open = ref(false);
		const wrapper = mount({
			components: { Dialog },
			setup: () => ({ open }),
			template: `
				<Dialog :open="open" title="Consent form" close-label="Close consent form">
					<p>Dialog body</p>
					<template #actions><button>Save</button></template>
				</Dialog>
			`,
		});

		expect(wrapper.find('dialog').exists()).toBe(false);
		expect(showModal).not.toHaveBeenCalled();

		open.value = true;
		await flushPromises();

		const dialog = wrapper.get('dialog');

		expect(showModal).toHaveBeenCalledOnce();
		expect(dialog.attributes('open')).toBeDefined();
		expect(dialog.attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'));
		expect(wrapper.text()).toContain('Dialog body');
		expect(wrapper.get('.dialog-actions').text()).toContain('Save');
	});

	it('requests to close from its button, Escape, and the backdrop', async () => {
		const wrapper = mount(Dialog, {
			props: { open: true, title: 'Consent form', closeLabel: 'Close consent form' },
		});

		await flushPromises();
		const dialog = wrapper.get('dialog');

		await wrapper.get('.dialog-close').trigger('click');
		await dialog.trigger('cancel');
		await dialog.trigger('click');

		expect(wrapper.emitted('close')).toHaveLength(3);
	});

	it('unmounts when its controlled open state closes', async () => {
		const open = ref(true);
		const wrapper = mount({
			components: { Dialog },
			setup: () => ({ open }),
			template: `
				<Dialog
					:open="open"
					title="Consent form"
					close-label="Close consent form"
					@close="open = false"
				/>
			`,
		});

		await flushPromises();

		await wrapper.get('.dialog-close').trigger('click');
		await flushPromises();

		expect(wrapper.find('dialog').exists()).toBe(false);
	});
});
