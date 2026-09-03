import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { PhoneField } from '../../PhoneField';
import { FormSection } from './FormSection';

/**
 * Who the guest is: the fields every registration needs, whichever flow it came through.
 *
 * These read and write the registration store directly rather than taking the form state as a
 * prop. That state lives in the store for the app's lifetime — both `/` and `/signup` register
 * against the same instance — so threading it through would only duplicate what the store already
 * holds.
 */
export const GuestInformationForm = observer(function GuestInformationForm() {
	const t = useTranslation();
	const { registration } = useRootStore();

	return (
		<FormSection legend={t.guestView.forms.informationLegend}>
			<TextField
				label={t.firstName}
				value={registration.guest.firstName}
				onChange={(event) => registration.updateGuest({ firstName: event.target.value.trim() })}
				required
				autoComplete="given-name"
			/>
			<TextField
				label={t.lastName}
				value={registration.guest.lastName}
				onChange={(event) => registration.updateGuest({ lastName: event.target.value.trim() })}
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
