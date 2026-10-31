import styled from '@emotion/styled';
import type { ReactNode } from 'react';

const Step = styled.li`
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 0 14px;

	.number {
		display: grid;
		width: 32px;
		height: 32px;
		place-items: center;
		border-radius: 50%;
		color: var(--color-on-brand);
		background: var(--color-brand);
		font-weight: 700;
	}

	.body {
		display: grid;
		gap: 12px;
		min-width: 0;
	}

	h2,
	p,
	ol {
		margin: 0;
	}

	.place {
		margin-top: -10px;
		color: var(--color-text-subtle);
		font-size: 14px;
		font-weight: 700;
	}

	p,
	li {
		line-height: 1.5;
	}
`;

export type ChecklistStepProps = {
	number: number;
	title: string;
	/** Where at the market the step is done. */
	place: string;
	children: ReactNode;
};

/** One numbered step on the Checklist screen: what to do, and where at the market to do it. */
export function ChecklistStep({ number, title, place, children }: ChecklistStepProps) {
	return (
		<Step className="admin-section">
			<span className="number" aria-hidden="true">
				{number}
			</span>
			<div className="body">
				<h2>{title}</h2>
				<p className="place">{place}</p>
				{children}
			</div>
		</Step>
	);
}
