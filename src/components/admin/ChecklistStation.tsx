import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId, useState, type ReactNode } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { StationCloseUp, type StationCloseUpProps } from './StationCloseUp';

const Station = styled.section`
	display: grid;
	gap: 14px;
	padding: 16px;
	border: 1.5px solid var(--color-border-soft);
	border-radius: var(--radius-lg);
	background: var(--color-surface);

	h2,
	p {
		margin: 0;
	}

	.heading {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 12px;
		align-items: center;
	}

	.number {
		display: grid;
		width: 36px;
		height: 36px;
		place-items: center;
		border-radius: 50%;
		color: var(--color-on-brand);
		background: var(--color-brand);
		font-size: 17px;
		font-weight: 700;
	}

	&[data-complete='true'] .number {
		background: var(--color-success);
	}

	.name {
		display: grid;
		gap: 2px;
	}

	h2 {
		font-family: var(--font-heading);
		font-size: 21px;
		line-height: 1.15;
		text-transform: none;
	}

	.place {
		color: var(--color-text-subtle);
		font-size: 14px;
	}

	.toggle {
		display: grid;
		width: 44px;
		height: 44px;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 50%;
		color: var(--color-brand);
		background: transparent;
		cursor: pointer;
	}

	.toggle svg {
		transition: transform 150ms ease;
	}

	.toggle[aria-expanded='true'] svg {
		transform: rotate(180deg);
	}

	.body {
		display: grid;
		gap: 14px;
		min-width: 0;
	}

	/* The grid above would otherwise win over the hidden attribute's own display: none. */
	.body[hidden] {
		display: none;
	}

	.done-when {
		display: grid;
		grid-template-columns: 20px minmax(0, 1fr);
		gap: 10px;
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		color: var(--color-brand-dark);
		background: var(--color-surface-soft);
		font-size: 14px;
		line-height: 1.45;
	}
`;

export type ChecklistStationProps = {
	number: number;
	title: string;
	place: string;
	/** Every step in the station, for its progress. */
	stepIds: readonly string[];
	closeUp: StationCloseUpProps;
	/** What finished looks like, after "Done when". */
	doneWhen: string;
	children: ReactNode;
};

/**
 * One station on the Checklist: its number on the floor plan, how far along it is, a close-up of
 * where it goes, its steps, and what finished looks like. Once every step is ticked it folds down to
 * its heading, so the list shortens as the market gets set up; it opens again on a tap.
 */
export const ChecklistStation = observer(function ChecklistStation({
	number,
	title,
	place,
	stepIds,
	closeUp,
	doneWhen,
	children,
}: ChecklistStationProps) {
	const t = adminTranslations.en.checklist;
	const { checklist } = useRootStore();
	const bodyId = useId();
	const headingId = useId();
	// Null until the worker opens or closes it themselves; until then, it follows completion.
	const [chosen, setChosen] = useState<boolean | null>(null);
	const complete = checklist.isComplete(stepIds);
	const expanded = chosen ?? !complete;
	const { done, total } = checklist.progress(stepIds);

	return (
		<Station aria-labelledby={headingId} data-complete={complete}>
			<div className="heading">
				<span className="number" aria-hidden="true">
					{number}
				</span>
				<div className="name">
					<h2 id={headingId}>{title}</h2>
					<p className="place">
						{place} ·{' '}
						{complete
							? t.complete
							: t.progress.replace('{done}', String(done)).replace('{total}', String(total))}
					</p>
				</div>
				<button
					type="button"
					className="toggle"
					aria-expanded={expanded}
					aria-controls={bodyId}
					aria-label={expanded ? t.hideSteps : t.showSteps}
					onClick={() => setChosen(!expanded)}
				>
					<svg
						width="22"
						height="22"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="m6 9 6 6 6-6" />
					</svg>
				</button>
			</div>
			<div className="body" id={bodyId} hidden={!expanded}>
				<StationCloseUp {...closeUp} />
				{children}
				<p className="done-when">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M4 12l5 5L20 6" />
					</svg>
					<span>
						<strong>{t.doneWhen}</strong> {doneWhen}
					</span>
				</p>
			</div>
		</Station>
	);
});
