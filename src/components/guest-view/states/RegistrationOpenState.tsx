import { GuestCombinedForm } from '@/components/guest-view/forms/GuestCombinedForm.tsx';

/**
 * The registration form, set straight on the page rather than in a card: it is the screen's one
 * job, so a frame around it only narrows the fields. Its clock is pinned under the app bar by
 * `GuestHome`.
 */
export function RegistrationOpenState() {
	// The wrapper is what the tour and the guest guide point at.
	return (
		<div data-tour="registration-form">
			<GuestCombinedForm />
		</div>
	);
}
