import { Card, CardContent } from '@mui/material';

import { GuestCombinedForm } from '@/components/guest-view/forms/GuestCombinedForm.tsx';
import { RegistrationCountdown } from '@/components/RegistrationCountdown.tsx';

export function RegistrationOpenState() {
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
}
