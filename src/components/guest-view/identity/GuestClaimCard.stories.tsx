import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import { translations, type Locale } from '../../../locales';
import type { GuestClaimResult } from '../../../services/guestVisitApi';
import { StorageKey, StorageService } from '../../../services/storage.service';
import { RootStoreProvider } from '../../../stores/react/store-context';
import { RootStore } from '../../../stores/root.store';
import { GuestClaimCard } from './GuestClaimCard';

/**
 * Where a worker's QR code lands on a guest's phone. The route (`ClaimView`) only reads the code
 * out of the URL fragment; this card is everything the guest sees and taps.
 *
 * Each story seeds its own store: `phoneHasSavedData` puts somebody's identity on the phone first,
 * which is what brings up the warning, and `redeem` stands in for `/api/guest-claim`.
 */
type GuestClaimCardArgs = {
	locale: Locale;
	token: string | null;
	phoneHasSavedData: boolean;
	redeem: (token: string) => Promise<GuestClaimResult>;
};

const token = 'claim-token-shown-as-a-qr-code-1234567890abcdef';
const copy = translations.en.claimView;

class MemoryStorage implements Storage {
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

const withPhone: Decorator = (Story, context) => {
	const { locale, phoneHasSavedData, redeem } = context.args as GuestClaimCardArgs;
	// Built once per story so a `play` function's claim is not thrown away by the next render.
	const [store] = useState(() => {
		const browserStorage = new MemoryStorage();
		const storage = new StorageService(browserStorage);

		if (phoneHasSavedData) {
			storage.set(StorageKey.GUEST_DEVICE_TOKEN, 'someone-elses-device-token');
			storage.set(StorageKey.GUEST_IDENTITY, {
				firstName: 'Bea',
				lastName: 'Before',
				phone: '510-555-0999',
			});
		}

		const created = new RootStore({ storage, browserStorage, claim: { redeem } });

		created.guest.notificationsDisabled = true;
		created.translations.setLanguage(locale);

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<Story />
		</RootStoreProvider>
	);
};

/** The card itself takes only the code; the other args are read by `withPhone`. */
function Fixture({ token }: GuestClaimCardArgs) {
	return <GuestClaimCard token={token} />;
}

const meta = {
	title: 'Guest/GuestClaimCard',
	component: Fixture,
	parameters: { shell: 'guest' },
	decorators: [withPhone],
	args: {
		locale: 'en',
		token,
		phoneHasSavedData: false,
		redeem: fn(() => new Promise<GuestClaimResult>(() => {})),
	},
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A phone with nothing saved on it: one button and nothing to warn about. */
export const FreshPhone: Story = {
	play: async ({ canvas, userEvent, args }) => {
		await expect(canvas.queryByText(copy.replaceHeading)).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: copy.submit }));
		await expect(args.redeem).toHaveBeenCalledWith(token);
		await expect(canvas.getByRole('button', { name: copy.submitting })).toBeDisabled();
	},
};

/** A shared phone already holding someone's saved information, which claiming would replace. */
export const PhoneWithSavedData: Story = {
	args: { phoneHasSavedData: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByText(copy.replaceHeading)).toBeVisible();
		await expect(canvas.getByText(copy.replaceWarning)).toBeVisible();
	},
};

/** An expired or already-used code: the phone is left as it was, and the guest told what to do. */
export const CodeRefused: Story = {
	args: { redeem: fn(() => Promise.reject(new Error('Guest claim failed'))) },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: copy.submit }));
		await expect(await canvas.findByRole('alert')).toHaveTextContent(copy.failed);
	},
};

/** A link that arrived without its code, e.g. copied by hand. */
export const MissingCode: Story = {
	args: { token: null },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('alert')).toHaveTextContent(copy.missingCode);
		await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
	},
};
