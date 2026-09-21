import styled from '@emotion/styled';
import { useEffect, useState } from 'react';

import { isStoryIndex, reviewPages } from './review-index';

const List = styled.div`
	@media print {
		break-inside: avoid-page;
		page-break-inside: avoid;
	}

	.section {
		display: flex;
		gap: 14px;
		align-items: baseline;
		padding: 9px 0;
		border-top: 1px solid #d9dfdc;
	}

	.section:first-child {
		border-top: 0;
	}

	.number {
		width: 24px;
		font-weight: 700;
	}

	.name {
		flex: 1;
	}

	.page {
		color: #6b6b6b;
		font-size: 13px;
		white-space: nowrap;
	}

	.colophon {
		display: grid;
		gap: 3px;
		margin: 28px 0 0;
		padding-top: 12px;
		border-top: 1px solid #d9dfdc;
		font-size: 13px;
	}

	.colophon .row {
		display: flex;
		gap: 10px;
	}

	.colophon .label {
		width: 90px;
		color: #6b6b6b;
	}
`;

type Row = { number: number; label: string; startPage?: number };

/**
 * The sections of the review document, in order, each with the page it starts on.
 *
 * The page numbers are something only a print run knows, so it hands them over as
 * `window.__REVIEW_CONTENTS__`. Read in Storybook there is no run, so the sections are listed from
 * the story index without them, which is enough to see the order they will print in.
 */
export function Contents() {
	const printed = window.__REVIEW_CONTENTS__;
	const [listed, setListed] = useState<Row[]>([]);

	useEffect(() => {
		if (printed) {
			return;
		}

		void (async () => {
			const index: unknown = await (await fetch('index.json')).json();

			if (isStoryIndex(index)) {
				setListed(
					reviewPages(index)
						.filter(({ kind }) => kind === 'section')
						.map(({ label }, position) => ({ number: position + 1, label })),
				);
			}
		})();
	}, [printed]);

	const rows: Row[] = printed?.sections ?? listed;

	return (
		<List>
			{rows.map(({ number, label, startPage }) => (
				<div className="section" key={number}>
					<span className="number">{number}</span>
					<span className="name">{label}</span>
					{startPage === undefined ? null : <span className="page">page {startPage}</span>}
				</div>
			))}
			{printed ? (
				<div className="colophon">
					{(
						[
							['Captured', printed.capturedAt],
							['Revision', printed.revision],
							['Language', printed.language],
						] as const
					).map(([label, value]) => (
						<div className="row" key={label}>
							<span className="label">{label}</span>
							<span>{value}</span>
						</div>
					))}
				</div>
			) : null}
		</List>
	);
}
