import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { formatGuestCount } from '../../services/guest-count';
import type { VisitStatus } from '../../services/visitStateMachine';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { useRootStore } from '../../stores/react/store-context';
import { dockOffset } from '../queue/call-bar';
import { TicketActionBar } from '../queue/TicketActionBar';

const Bar = styled.section`
	box-sizing: border-box;
	display: grid;
	gap: 10px;
	padding: 14px 16px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg);
	color: var(--color-text);
	background: var(--color-background);
	font-family: var(--font-body);

	/* On a phone it docks where the ticket sheet would, on the tab bar, with the list scrolling under. */
	&[data-docked='true'] {
		position: fixed;
		inset-inline: 0;
		bottom: ${dockOffset};
		z-index: 2;
		width: min(100%, 480px);
		margin-inline: auto;
		padding-bottom: 16px;
		border-width: 0;
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		box-shadow: 0 -8px 24px rgb(30 71 77 / 18%);
	}

	h2 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 16px;
		font-weight: 700;
	}

	p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;

/**
 * What can be done with the guests picked out of an ended session: a button per status at least
 * one of them can be corrected to. Like a single correction, it asks first, saying how many change
 * and how many are already there, since a past session's numbers change with it.
 */
export const BulkCorrectionBar = observer(function BulkCorrectionBar({
	docked,
}: {
	/** Fixed to the bottom of a phone's screen, rather than in place under a desk's list. */
	docked: boolean;
}) {
	const t = adminTranslations.en;
	const { admin, confirmation } = useRootStore();
	const participants = admin.sessionParticipants;
	const labels = adminVisitStatusLabels('en');
	const bulk = participants.bulk;

	if (!participants.isSelecting) {
		return null;
	}

	async function correct(status: VisitStatus) {
		const to = labels[status];
		const unchanged = bulk.unchanged(status).length;
		const confirmed = await confirmation.ask({
			question: t.participants.bulkConfirmQuestion
				.replace('{guests}', formatGuestCount(bulk.eligible(status).length))
				.replace('{to}', to),
			details: [
				...(unchanged
					? [
							t.participants.bulkUnchanged
								.replace('{guests}', formatGuestCount(unchanged))
								.replace('{to}', to),
						]
					: []),
				t.participants.confirmDetail.replaceAll('{to}', to),
			],
			confirmLabel: t.participants.confirm,
			dismissLabel: t.cancel,
		});

		if (confirmed) {
			await participants.correctChecked(status);
		}
	}

	return (
		<Bar aria-labelledby="bulk-correction-title" data-docked={docked}>
			<h2 id="bulk-correction-title">{t.participants.bulkTitle}</h2>
			<p role="status">
				{participants.isCorrecting
					? t.participants.correcting
					: bulk.count
						? t.participants.selected.replace('{count}', String(bulk.count))
						: t.participants.selectHint}
			</p>
			{bulk.count ? (
				<TicketActionBar>
					{bulk.targets.map((status) => (
						<button
							key={status}
							type="button"
							disabled={participants.isCorrecting}
							onClick={() => void correct(status)}
						>
							{t.participants.changeTo.replace('{status}', labels[status])}
						</button>
					))}
				</TicketActionBar>
			) : null}
		</Bar>
	);
});
