import { TableCell } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { languages, type Locale } from '../../locales';
import { RegistrationRoster } from '../../models/registration-roster';
import { GuestTableRow } from './GuestTableRow';
import { QueueSection } from './QueueSection';
import type { QueueGuest } from './types';

export type SessionGuestListProps = {
	guests: QueueGuest[];
};

/** Everyone registered for the session, before the lottery has decided anything. */
export const SessionGuestList = observer(function SessionGuestList({
	guests,
}: SessionGuestListProps) {
	const t = adminTranslations.en;

	function guestLanguageLabel(locale: Locale) {
		return languages.find((language) => language.code === locale)?.englishLabel ?? locale;
	}

	const roster = new RegistrationRoster(guests);
	const [collapsed, setCollapsed] = useState({ registered: false, cancelled: false });

	function rows(guests: QueueGuest[]) {
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
