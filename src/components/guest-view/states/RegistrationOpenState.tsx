import { Card, CardContent } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { GuestCombinedForm } from '@/components/guest-view/forms/GuestCombinedForm.tsx';
import { GuestServiceState } from '@/components/guest-view/GuestServiceState.tsx';
import { RegistrationCountdown } from '@/components/RegistrationCountdown.tsx';
import { useRootStore } from '@/stores/react/store-context.tsx';

export const RegistrationOpenState = observer(function RegistrationOpenState() {
	const { visit } = useRootStore();

	if (visit.currentVisit) {
		return <GuestServiceState />;
	}

	return (
		<>
			<RegistrationCountdown />
			<Card>
				<CardContent>
					<GuestCombinedForm />
				</CardContent>
			</Card>
		</>
	);
});
