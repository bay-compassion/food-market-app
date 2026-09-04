import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../stores/react/store-context';
import { DemoGuestTable } from './DemoGuestTable';

export const DemoGuestPicker = observer(function DemoGuestPicker() {
	const { admin, session } = useRootStore();
	const roster = admin.demo.forSession(session.currentState?.event?.id ?? null);

	return (
		<section aria-label="Demo guests">
			<h2>View as guest</h2>
			{admin.isBusy ? (
				<p role="status">Loading demo guests…</p>
			) : !roster ? (
				<p>Load a scenario to open its demo guests. Previously seeded data must be loaded again.</p>
			) : !roster.guests.length ? (
				<p>This scenario has no demo guests.</p>
			) : (
				<DemoGuestTable key={roster.marketEventId} roster={roster} />
			)}
			{admin.demo.openError ? (
				<p role="alert">Could not open the guest tab. Allow popups for this site and try again.</p>
			) : null}
		</section>
	);
});
