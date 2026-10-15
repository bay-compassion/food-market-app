import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';

import type { GuestFormCopy } from '../../../locales';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { PhoneField } from '../../PhoneField';
import { FormSection } from './FormSection';
import { PronunciationField } from './PronunciationField';
import { useGuestFormCopy } from './use-guest-form-copy';

/**
 * Who the guest is: the fields every registration needs, whichever flow it came through.
 *
 * These read and write the registration store directly rather than taking the form state as a
 * prop. That state lives in the store for the app's lifetime — both `/` and `/signup` register
 * against the same instance — so threading it through would only duplicate what the store already
 * holds.
 *
 * `copy` rewords the parts that address the guest, for a worker entering someone else's details.
 */
export const GuestInformationForm = observer(function GuestInformationForm({
	copy: override,
}: {
	copy?: Partial<GuestFormCopy>;
}) {
	const t = useTranslation();
	const copy = useGuestFormCopy(override);
	const { registration } = useRootStore();

	return (
		<FormSection legend={copy.informationLegend}>
			<PronunciationField copy={override}>
				<TextField
					label={t.firstName}
					value={registration.guest.firstName}
					onChange={(event) => registration.updateGuest({ firstName: event.target.value })}
					// Trimmed on the way out rather than on every keystroke: trimming as the guest types
					// would eat the space the moment it was pressed, leaving no way to enter a name in two
					// words. The server trims these fields again before storing them.
					onBlur={(event) => registration.updateGuest({ firstName: event.target.value.trim() })}
					required
					autoComplete="given-name"
				/>
			</PronunciationField>
			<TextField
				label={t.lastName}
				value={registration.guest.lastName}
				onChange={(event) => registration.updateGuest({ lastName: event.target.value })}
				onBlur={(event) => registration.updateGuest({ lastName: event.target.value.trim() })}
				required
				autoComplete="family-name"
			/>
			<PhoneField
				label={t.phone}
				value={registration.guest.phone}
				onChange={(value) => registration.updateGuest({ phone: value })}
				required
			/>
		</FormSection>
	);
});
