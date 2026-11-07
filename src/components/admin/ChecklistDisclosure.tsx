import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { useRootStore } from '../../stores/react/store-context';

const Disclosure = styled.div`
	display: grid;
	min-width: 0;
	scroll-margin-top: 80px;

	.summary {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 24px;
		gap: 12px;
		align-items: center;
		width: 100%;
		min-height: 48px;
		padding: 4px 0;
		border: 0;
		color: inherit;
		background: transparent;
		font: inherit;
		font-weight: 500;
		line-height: 1.35;
		text-align: start;
		cursor: pointer;
	}

	.summary svg {
		color: var(--color-brand);
		transition: transform 150ms ease;
	}

	.summary[aria-expanded='true'] svg {
		transform: rotate(180deg);
	}

	.summary:focus-visible {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}

	.content {
		display: grid;
		gap: 12px;
		min-width: 0;
		padding-bottom: 14px;
	}

	/* A card of its own, for the sections of When You Need It. */
	&[data-variant='card'] {
		padding: 4px 16px;
		border: 1.5px solid var(--color-border-soft);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
	}

	&[data-variant='card'] > .summary {
		min-height: 52px;
		font-size: 17px;
		font-weight: 700;
	}

	/* One of a list of rows, divided by rules. */
	&[data-variant='row'] + &[data-variant='row'] {
		border-top: 1px solid var(--color-divider);
	}
`;

export type ChecklistDisclosureProps = {
	summary: ReactNode;
	variant?: 'card' | 'row';
	/**
	 * Help topics that open this when a link elsewhere on the Checklist asks for one: a topic's own
	 * row, and the card it sits in.
	 */
	topics?: readonly string[];
	/** Whether this is the topic itself, scrolled to once it opens, rather than a card around it. */
	isTopic?: boolean;
	children: ReactNode;
};

/**
 * A heading that opens to show what is under it. A button rather than `<details>`, which older
 * Safari lays out unreliably and which loses its marker once its summary is styled; the content is
 * left out of the page until it opens.
 *
 * A link in a step can ask for a help topic further down (`ChecklistStore.reveal`): every
 * disclosure listing that topic opens, the card first and then, once it is drawn, the topic's own
 * row, which scrolls into view and marks the request done.
 */
export const ChecklistDisclosure = observer(function ChecklistDisclosure({
	summary,
	variant = 'row',
	topics = [],
	isTopic = false,
	children,
}: ChecklistDisclosureProps) {
	const { checklist } = useRootStore();
	const [open, setOpen] = useState(false);
	const contentId = useId();
	const element = useRef<HTMLDivElement>(null);
	const request = checklist.revealRequest;
	const requested = request !== null && topics.includes(request.topic);

	useEffect(() => {
		if (!requested) {
			return;
		}

		setOpen(true);

		if (isTopic) {
			element.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			// Focus follows, so a keyboard or screen reader user lands on the topic too.
			element.current?.querySelector('button')?.focus({ preventScroll: true });
			checklist.settleReveal();
		}
	}, [request, requested, isTopic, checklist]);

	return (
		<Disclosure data-variant={variant} ref={element}>
			<button
				type="button"
				className="summary"
				aria-expanded={open}
				aria-controls={open ? contentId : undefined}
				onClick={() => setOpen(!open)}
			>
				<span>{summary}</span>
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
			{open ? (
				<div className="content" id={contentId}>
					{children}
				</div>
			) : null}
		</Disclosure>
	);
});
