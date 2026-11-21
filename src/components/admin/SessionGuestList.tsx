import { Button, TableCell } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { languages, type Locale } from '../../locales';
import { RegistrationRoster } from '../../models/registration-roster';
import { useRootStore } from '../../stores/react/store-context';
import { GuestTableRow } from './GuestTableRow';
import { QueueSection } from './QueueSection';
import type { QueueGuest } from './types';
import { useConfirmVisitCommand } from './use-confirm-visit-command';
import { visitCommandLabels } from './VisitCommandButtons';

export type SessionGuestListProps = {
	guests: QueueGuest[];
};

/**
 * Everyone registered for the session, before the lottery has decided anything — and the
 * volunteers who shopped in the premarket, each of whom a worker can remove.
 */
export const SessionGuestList = observer(function SessionGuestList({
	guests,
}: SessionGuestListProps) {
	const t = adminTranslations.en;
	const { admin } = useRootStore();
	const confirmCommand = useConfirmVisitCommand();

	function guestLanguageLabel(locale: Locale) {
		return languages.find((language) => language.code === locale)?.englishLabel ?? locale;
	}

	const roster = new RegistrationRoster(guests);
	const [collapsed, setCollapsed] = useState({
		registered: false,
		premarket: false,
		cancelled: false,
	});

	async function remove(guest: QueueGuest) {
		if (await confirmCommand(guest, 'cancel')) {
			await admin.runGuestCommand(guest, 'cancel');
		}
	}

	function rows(guests: QueueGuest[], removable = false) {
		return guests.map((guest) => (
			<GuestTableRow key={guest.id}>
				<TableCell>
					<div className="identity">
						<div className="name">
							<span>
								{guest.firstName} {guest.lastName}
							</span>
						</div>
						<div className="details">
							<span>
								{t.householdCount} {guest.householdSize}
							</span>
							<span>{guestLanguageLabel(guest.locale)}</span>
							<span>{guest.phone}</span>
						</div>
					</div>
				</TableCell>
				{removable ? (
					<TableCell className="actions-cell">
						<Button
							variant="outlined"
							size="small"
							disabled={admin.isBusy}
							aria-label={`${visitCommandLabels().cancel}: ${guest.firstName} ${guest.lastName}`}
							onClick={() => void remove(guest)}
						>
							{visitCommandLabels().cancel}
						</Button>
					</TableCell>
				) : null}
			</GuestTableRow>
		));
	}

	return (
		<>
			<QueueSection
				title={t.registered}
				count={roster.registered.length}
				emptyText={t.noRegisteredGuests}
				open={!collapsed.registered}
				onToggle={() => setCollapsed((value) => ({ ...value, registered: !value.registered }))}
			>
				{rows(roster.registered)}
			</QueueSection>
			<QueueSection
				title={t.premarketHeading}
				count={roster.premarket.length}
				emptyText={t.noPremarketVolunteers}
				open={!collapsed.premarket}
				onToggle={() => setCollapsed((value) => ({ ...value, premarket: !value.premarket }))}
			>
				{rows(roster.premarket, true)}
			</QueueSection>
			<QueueSection
				title={t.cancelled}
				count={roster.cancelled.length}
				emptyText={t.noCancelledGuests}
				open={!collapsed.cancelled}
				onToggle={() => setCollapsed((value) => ({ ...value, cancelled: !value.cancelled }))}
			>
				{rows(roster.cancelled)}
			</QueueSection>
		</>
	);
});
