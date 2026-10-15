import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';

import type { GuestFormCopy } from '../../../locales';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { AttachedField } from '../../ui/AttachedField';
import { useGuestFormCopy } from './use-guest-form-copy';

/**
 * How to say the guest's name, for whoever calls it out: optional, so it is folded into a thin
 * strip under the first-name field until the guest opens it.
 *
 * A returning guest is not asked for their name again, so for them there is no field to hang it
 * from and it stands on its own.
 */
export const PronunciationField = observer(function PronunciationField({
	children,
	copy: override,
}: {
	/** The first-name field, which the strip is joined to. */
	children?: ReactNode;
	/** Wording to use in place of the guest's own, for a worker filling it in for them. */
	copy?: Partial<GuestFormCopy>;
}) {
	const t = useTranslation();
	const copy = useGuestFormCopy(override);
	const { registration } = useRootStore();

	return (
		<AttachedField
			offer={copy.pronunciationOffer}
			label={t.guestView.forms.pronunciationLabel}
			hint={copy.pronunciationHelp}
			collapseLabel={copy.pronunciationCollapse}
			value={registration.guest.pronunciation}
			onChange={(pronunciation) => registration.updateGuest({ pronunciation })}
			onBlur={(event) => registration.updateGuest({ pronunciation: event.target.value.trim() })}
			maxLength={100}
		>
			{children}
		</AttachedField>
	);
});
