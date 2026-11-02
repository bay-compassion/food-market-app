import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';

const Section = styled.section`
	h2 {
		margin: 0 0 4px;
		color: var(--color-brand-dark);
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: 700;
		text-transform: none;
	}

	.row {
		display: flex;
		width: 100%;
		min-height: 48px;
		gap: 10px;
		align-items: center;
		padding: 0;
		border: 0;
		color: var(--color-text);
		background: transparent;
		font: inherit;
		font-size: 15px;
		font-weight: 500;
		text-align: start;
	}

	.row + .row {
		border-top: 1px solid var(--color-divider);
	}

	.row span {
		flex: 1;
	}

	button.row {
		cursor: pointer;
	}

	button.row svg {
		color: var(--color-text-subtle);
	}
`;

function Chevron() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d="M9 6l6 6-6 6" />
		</svg>
	);
}

/**
 * What to do by hand before registration opens. The session is known to be there, since this shows
 * only once one is scheduled; the other two are physical, so they lead to the Checklist's steps.
 */
export function BeforeTheMarket({ onOpenChecklist }: { onOpenChecklist: () => void }) {
	const t = adminTranslations.en.today;

	return (
		<Section>
			<h2>{t.beforeTheMarket}</h2>
			<div className="row">
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="var(--color-success)"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M5 12.5l4.5 4.5L19 7.5" />
				</svg>
				<span>{t.sessionOnSchedule}</span>
			</div>
			{[t.setUpRoomDisplay, t.setUpCheckIn].map((label) => (
				<button key={label} type="button" className="row" onClick={onOpenChecklist}>
					<span>{label}</span>
					<Chevron />
				</button>
			))}
		</Section>
	);
}
