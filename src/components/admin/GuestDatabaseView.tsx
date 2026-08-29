import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { languages, type Locale } from '../../locales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { VisitCommand, VisitStatus } from '../../services/visitStateMachine';
import { useTranslation } from '../../stores/react/use-translation';
import { AddGuestSection } from './AddGuestSection';
import type { ManualGuest, QueueGuest } from './types';
import { VisitCommandButtons } from './VisitCommandButtons';

export type GuestDatabaseViewProps = {
	guests: QueueGuest[];
	statusLabels: Record<VisitStatus, string>;
	admissions: GuestAdmission[];
	busy?: boolean;
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
	onSearch: () => void;
	onRun: (guest: QueueGuest, command: VisitCommand) => void;
	onAddGuest: (guest: ManualGuest) => void;
};

const Section = styled.section`
	.search-form {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
	}

	.search-form button {
		padding: 0 17px;
		border: 0;
		border-radius: 12px;
		color: white;
		background: var(--color-brand);
		font-weight: 700;
	}
`;

/** Every guest on record, searchable, with whatever action their current visit allows. */
export const GuestDatabaseView = observer(function GuestDatabaseView({
	guests,
	statusLabels,
	admissions,
	busy,
	searchQuery,
	onSearchQueryChange,
	onSearch,
	onRun,
	onAddGuest,
}: GuestDatabaseViewProps) {
	const t = adminTranslations.en;
	const base = useTranslation();

	function guestLanguageLabel(locale: Locale) {
		return languages.find((language) => language.code === locale)?.label ?? locale;
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSearch();
	}

	return (
		<>
			<Section className="admin-section guest-section">
				<div className="section-heading">
					<h2>{t.allGuests}</h2>
				</div>
				<form className="search-form" onSubmit={handleSubmit}>
					<input
						type="search"
						placeholder={t.searchPlaceholder}
						aria-label={t.searchPlaceholder}
						value={searchQuery}
						onChange={(event) => onSearchQueryChange(event.target.value)}
					/>
					<button type="submit">{t.search}</button>
				</form>
				{guests.length ? (
					<div className="guest-list">
						{guests.map((guest) => (
							<article key={guest.id} className="guest-row">
								<div>
									<strong>
										{guest.firstName} {guest.lastName}
									</strong>
									<span>
										{guest.phone} · {base.household}: {guest.householdSize}
									</span>
									<span>
										{base.language}: {guestLanguageLabel(guest.locale)}
									</span>
								</div>
								<div className="guest-actions">
									<span className="guest-status">{statusLabels[guest.status]}</span>
									<VisitCommandButtons
										status={guest.status}
										disabled={busy}
										onRun={(command) => onRun(guest, command)}
									/>
								</div>
							</article>
						))}
					</div>
				) : (
					<p className="empty-state">{t.noGuests}</p>
				)}
			</Section>

			<AddGuestSection admissions={admissions} busy={busy} onAddGuest={onAddGuest} />
		</>
	);
});
