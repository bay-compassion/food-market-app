import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { AttachedField } from '../../ui/AttachedField';

/**
 * How to say the guest's name, for whoever calls it out: optional, so it is folded into a thin
 * strip under the first-name field until the guest opens it.
 *
 * A returning guest is not asked for their name again, so for them there is no field to hang it
 * from and it stands on its own.
 */
export const PronunciationField = observer(function PronunciationField({
	children,
}: {
	/** The first-name field, which the strip is joined to. */
	children?: ReactNode;
}) {
	const t = useTranslation();
	const { registration } = useRootStore();

	return (
		<AttachedField
			offer={t.guestView.forms.pronunciationOffer}
			label={t.guestView.forms.pronunciationLabel}
			hint={t.guestView.forms.pronunciationHelp}
			collapseLabel={t.guestView.forms.pronunciationCollapse}
			value={registration.guest.pronunciation}
			onChange={(pronunciation) => registration.updateGuest({ pronunciation })}
			onBlur={(event) => registration.updateGuest({ pronunciation: event.target.value.trim() })}
			maxLength={100}
		>
			{children}
		</AttachedField>
	);
});
