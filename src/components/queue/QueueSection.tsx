import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId, type ReactNode } from 'react';

import type { QueueSectionId } from '../../stores/queue-desk.store';
import { useQueueDesk } from './queue-desk-context';

export type QueueSectionProps = {
	/** Which section this is, so the desk remembers whether the volunteer folded it away. */
	id: QueueSectionId;
	title: string;
	/** Beside the title, kept in view while the section is folded. */
	count: ReactNode;
	/** A control drawn on the heading line opposite the title, such as adding a guest. */
	action?: ReactNode;
	children: ReactNode;
};

const Section = styled.section`
	padding: 14px 10px 10px;
	border-radius: var(--radius-lg);
	background: var(--color-surface-soft);

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		min-height: 36px;
		padding: 0 8px 6px 0;
	}

	&[data-collapsed='true'] {
		padding-bottom: 8px;

		header {
			padding-bottom: 0;
		}
	}

	h2 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: 700;
	}

	/* The whole title is the toggle, so it is an easy target on a phone. */
	.toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		padding: 0 8px 0 4px;
		border: 0;
		border-radius: var(--radius-md);
		color: inherit;
		background: transparent;
		font: inherit;
		cursor: pointer;
	}

	.toggle:focus-visible {
		outline: 2px solid var(--color-brand);
	}

	.chevron {
		flex: none;
		color: var(--color-text-muted);
		transition: transform 120ms ease-out;
	}

	&[data-collapsed='true'] .chevron {
		transform: rotate(-90deg);
	}

	.count {
		min-width: 24px;
		padding: 1px 7px;
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		background: var(--color-background);
		font-family: var(--font-body);
		font-size: 13px;
		text-align: center;
	}
`;

function Chevron() {
	return (
		<svg className="chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
			<path
				d="M4 6l4 4 4-4"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * One section of the queue screen — a bucket of tickets, or the households served — whose title
 * folds it away and back. Its count and its heading action stay in view while it is folded.
 */
export const QueueSection = observer(function QueueSection({
	id,
	title,
	count,
	action,
	children,
}: QueueSectionProps) {
	const desk = useQueueDesk();
	const bodyId = useId();
	const isCollapsed = desk.isCollapsed(id);

	return (
		<Section aria-label={title} data-collapsed={isCollapsed}>
			<header>
				<h2>
					<button
						type="button"
						className="toggle"
						aria-expanded={!isCollapsed}
						aria-controls={bodyId}
						onClick={() => desk.toggleSection(id)}
					>
						<Chevron />
						{title}
						<span className="count">{count}</span>
					</button>
				</h2>
				{action}
			</header>
			<div id={bodyId} hidden={isCollapsed}>
				{children}
			</div>
		</Section>
	);
});
