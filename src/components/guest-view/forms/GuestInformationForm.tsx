import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { FormField } from '../../FormField';
import { PhoneField } from '../../PhoneField';

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
		<>
			<FormField
				label={t.firstName}
				value={registration.guest.firstName}
				onChange={(value) => registration.updateGuest({ firstName: String(value) })}
				required
				autocomplete="given-name"
			/>
			<FormField
				label={t.lastName}
				value={registration.guest.lastName}
				onChange={(value) => registration.updateGuest({ lastName: String(value) })}
				required
				autocomplete="family-name"
			/>
			<PhoneField
				label={t.phone}
				value={registration.guest.phone}
				onChange={(value) => registration.updateGuest({ phone: value })}
				required
			/>
		</>
	);
});
