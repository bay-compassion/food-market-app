import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { adminTranslations } from '../adminLocales';
import AddGuestSection from '../components/admin/AddGuestSection.vue';
import type { GuestAdmission } from '../services/guestAdmission';

const t = adminTranslations.en;

function mountSection(admissions: GuestAdmission[]) {
	return mount(AddGuestSection, { props: { locale: 'en' as const, admissions, busy: false } });
}

async function openForm(admissions: GuestAdmission[]) {
	const wrapper = mountSection(admissions);

	await wrapper.find('.add-guest-button').trigger('click');

	return wrapper;
}

describe('AddGuestSection', () => {
	it('renders nothing when the session cannot accept a guest', () => {
		const wrapper = mountSection([]);

		expect(wrapper.find('.add-guest-button').exists()).toBe(false);
		expect(wrapper.text()).toBe('');
	});

	it('lets a worker choose the draw or a reserved spot before the lottery runs', async () => {
		const wrapper = await openForm(['lottery', 'queue']);
		// [0] is the age range select, which is always present.
		const options = wrapper.findAll('select')[1]!.findAll('option');

		expect(options.map((option) => option.text())).toEqual([t.admitToLottery, t.admitToQueue]);
		// The first option leads, so the fair choice is what a worker gets by default.
		expect(wrapper.text()).toContain(t.admitToLotteryHelp);
	});

	it('drops the choice when the session only allows one way in', async () => {
		const wrapper = await openForm(['queue']);
		const selects = wrapper.findAll('select');

		// The age range select, plus just the queue placement — no point asking a question with a
		// single answer.
		expect(selects).toHaveLength(2);
		expect(selects[1]!.findAll('option').map((option) => option.text())).toEqual([
			t.placeEnd,
			t.placeNext,
		]);
		expect(wrapper.text()).toContain(t.admitToQueueHelp);
	});

	it('hides the queue placement for an admission that never joins a line', async () => {
		const wrapper = await openForm(['served']);

		// Only the age range select remains.
		expect(wrapper.findAll('select')).toHaveLength(1);
		expect(wrapper.text()).toContain(t.admitAsServedHelp);
	});

	it('offers the draw odds only to a guest actually entering the draw', async () => {
		const wrapper = await openForm(['lottery', 'queue']);

		expect(wrapper.text()).toContain(t.lotteryWeightLabel);
		// Switching to a reserved spot takes the guest out of the draw, so the odds go with it.
		await wrapper.findAll('select')[1]!.setValue('queue');
		expect(wrapper.text()).not.toContain(t.lotteryWeightLabel);
	});

	it('starts a weighted guest on even odds', async () => {
		const wrapper = await openForm(['lottery']);

		await wrapper.find('form').trigger('submit');

		expect(wrapper.emitted('addGuest')?.[0]?.[0]).toMatchObject({
			admission: 'lottery',
			lotteryWeightTier: 'standard',
		});
	});

	it('emits the weight tier the worker picked', async () => {
		const wrapper = await openForm(['lottery']);

		// [0] is the age range select; the admission select is hidden with a single admission, so
		// [1] is the lottery weight tier.
		await wrapper.findAll('select')[1]!.setValue('highest');
		await wrapper.find('form').trigger('submit');

		expect(wrapper.emitted('addGuest')?.[0]?.[0]).toMatchObject({
			lotteryWeightTier: 'highest',
		});
	});

	it('emits the guest with the admission the worker picked', async () => {
		const wrapper = await openForm(['lottery', 'queue']);

		await wrapper.findAll('select')[1]!.setValue('queue');
		await wrapper.find('form').trigger('submit');

		expect(wrapper.emitted('addGuest')?.[0]?.[0]).toMatchObject({
			admission: 'queue',
			queuePlacement: 'end',
		});
	});

	it('closes the form once the guest has been handed to the container', async () => {
		const wrapper = await openForm(['queue']);

		await wrapper.find('form').trigger('submit');

		expect(wrapper.find('form').exists()).toBe(false);
		expect(wrapper.find('.add-guest-button').exists()).toBe(true);
	});
});
