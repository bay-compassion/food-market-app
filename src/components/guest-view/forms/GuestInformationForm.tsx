import { observer } from 'mobx-react-lite';

import type { GuestFormCopy } from '../../../locales';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { PhoneField } from '../../PhoneField';
import { FormSection } from './FormSection';
import { GuestNameField } from './GuestNameField';
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
			<GuestNameField
				field="firstName"
				label={t.firstName}
				autoComplete="given-name"
				initialsMessage={copy.initialsOnly}
				attach={(field) => <PronunciationField copy={override}>{field}</PronunciationField>}
			/>
			<GuestNameField
				field="lastName"
				label={t.lastName}
				autoComplete="family-name"
				initialsMessage={copy.initialsOnly}
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
