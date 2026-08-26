import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales';
import QueueView from '../components/admin/QueueView.vue';
import type { QueueGuest } from '../components/admin/types';
import type { VisitStatus } from '../services/visitStateMachine';

const statusLabels = {
	waiting: 'Waiting',
	called: 'Called',
	served: 'Served',
	registered: 'Registered',
	not_placed: 'Not placed',
	no_show: 'No show',
	cancelled: 'Cancelled',
} satisfies Record<VisitStatus, string>;

function guest(overrides: Partial<QueueGuest> & { id: string }): QueueGuest {
	return {
		firstName: 'Ari',
		lastName: 'Guest',
		phone: '555-0100',
		householdSize: 2,
		locale: 'en',
		queuePosition: null,
		calledAt: null,
		status: 'waiting',
		...overrides,
	};
}

function mountQueue(guests: QueueGuest[], serviceStarted = true) {
	return mount(QueueView, {
		props: {
			locale: 'en' as const,
			guests,
			counts: { waiting: 2, called: 1, served: 4 },
			statusLabels,
			serviceStarted,
			admissions: ['queue'],
			busy: false,
		},
	});
}

describe('QueueView', () => {
	it('explains that the queue is not open before service starts', () => {
		const wrapper = mountQueue([], false);

		expect(wrapper.text()).toContain(adminTranslations.en.queueNotStarted);
		expect(wrapper.text()).not.toContain(adminTranslations.en.callNext);
	});

	it('puts the counts summary and call control above the guest lists', () => {
		const wrapper = mountQueue([guest({ id: 'a', queuePosition: 1 })]);
		const text = wrapper.text();

		// The whole point of the view: a worker on a phone sees these without scrolling.
		expect(text).toContain('2 Waiting · 1 At the table · 4 Served');
		expect(text.indexOf(adminTranslations.en.callNext)).toBeLessThan(text.indexOf('Ari Guest'));
	});

	it('separates called guests from waiting guests, longest-called first', () => {
		const wrapper = mountQueue([
			guest({ id: 'a', status: 'waiting', queuePosition: 3 }),
			guest({
				id: 'b',
				firstName: 'Bo',
				status: 'called',
				calledAt: '2026-08-08T18:10:00.000Z',
			}),
			guest({
				id: 'c',
				firstName: 'Cass',
				status: 'called',
				calledAt: '2026-08-08T18:02:00.000Z',
			}),
		]);
		const called = wrapper
			.findAll('.guest-row')
			.slice(0, 2)
			.map((row) => row.text());

		expect(called[0]).toContain('Cass');
		expect(called[1]).toContain('Bo');
	});

	it('shows how long a called guest has been waiting', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-08T18:12:00.000Z'));
		const wrapper = mountQueue([
			guest({ id: 'b', status: 'called', calledAt: '2026-08-08T18:00:00.000Z' }),
		]);

		expect(wrapper.text()).toContain('Called 12 min ago');
		vi.useRealTimers();
	});

	it('hides finished guests behind a toggle', async () => {
		const wrapper = mountQueue([
			guest({ id: 'd', firstName: 'Dee', status: 'served' }),
			guest({ id: 'e', firstName: 'Eli', status: 'no_show' }),
		]);

		expect(wrapper.text()).not.toContain('Dee');

		await wrapper.find('.resolved-toggle').trigger('click');

		expect(wrapper.text()).toContain('Dee');
		expect(wrapper.text()).toContain('Eli');
	});

	it('asks the parent to call the chosen number of guests', async () => {
		const wrapper = mountQueue([guest({ id: 'a', queuePosition: 1 })]);

		await wrapper.find('.call-next input').setValue(3);
		await wrapper.find('.call-next').trigger('submit');

		expect(wrapper.emitted('callNext')).toEqual([[3]]);
	});

	it('cannot call anyone when nobody is waiting', () => {
		const wrapper = mountQueue([guest({ id: 'b', status: 'called' })]);

		expect(wrapper.find('.call-next button').attributes('disabled')).toBeDefined();
	});

	it('only offers the transitions that are legal from each status', async () => {
		const wrapper = mountQueue([
			guest({ id: 'b', status: 'called', calledAt: '2026-08-08T18:00:00.000Z' }),
		]);

		await flushPromises();
		const actions = wrapper.find('.guest-row .visit-commands').text();

		expect(actions).toContain('Mark served');
		expect(actions).toContain('Mark no show');
		expect(actions).toContain('Return to queue');
		// Calling an already-called guest is not a legal transition.
		expect(actions).not.toContain('Call guest');
	});
});
