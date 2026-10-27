import { Card, CardContent } from '@mui/material';

import { GuestCombinedForm } from '@/components/guest-view/forms/GuestCombinedForm.tsx';
import { GuestHelpLink } from '@/components/guest-view/GuestHelpLink.tsx';
import { RegistrationCountdown } from '@/components/RegistrationCountdown.tsx';

export function RegistrationOpenState() {
	return (
		<>
			<RegistrationCountdown />
			{/* Card clips overflow by default, which would stop the form's sticky submit bar sticking. */}
			<Card data-tour="registration-form" sx={{ overflow: 'visible' }}>
				<CardContent>
					{/* At the top rather than the end, where it would sit below the submit button. */}
					<GuestHelpLink />
					<GuestCombinedForm />
				</CardContent>
			</Card>
		</>
	);
}
