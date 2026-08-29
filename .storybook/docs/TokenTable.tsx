import styled from '@emotion/styled';
import type { CSSProperties } from 'react';

import type { TokenTableProps } from './types';
import { useTokenValues } from './use-token-values';

const Table = styled.table`
	width: 100%;
	border-collapse: collapse;

	th {
		padding: 10px 12px;
		border-bottom: 2px solid #dce3df;
		color: var(--color-text-subtle);
		font-family: var(--font-heading);
		font-size: 12px;
		letter-spacing: 0.06em;
		text-align: start;
		text-transform: uppercase;
	}

	td {
		padding: 10px 12px;
		border-bottom: 1px solid #eef2f0;
		vertical-align: middle;
	}

	code {
		font-size: 13px;
	}

	.token-sample.color {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-sm);
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
	}

	.token-sample.radius {
		width: 96px;
		height: 48px;
		background: var(--color-surface-soft);
		box-shadow: inset 0 0 0 1.5px var(--color-brand);
	}
`;

/** The colour and radius specimens, reading their values from the live document. */
export function TokenTable({ tokens, preview }: TokenTableProps) {
	const values = useTokenValues(tokens.map(([token]) => token));

	function sampleStyle(token: string): CSSProperties {
		return preview === 'color'
			? { background: `var(${token})` }
			: { borderRadius: `var(${token})` };
	}

	return (
		<Table className="token-table">
			<thead>
				<tr>
					<th>
						<span className="sr-only">Sample</span>
					</th>
					<th>Token</th>
					<th>Value</th>
					<th>Used for</th>
				</tr>
			</thead>
			<tbody>
				{tokens.map(([token, usage]) => (
					<tr key={token}>
						<td>
							<div className={`token-sample ${preview}`} style={sampleStyle(token)} />
						</td>
						<td>
							<code>{token}</code>
						</td>
						<td>
							<code>{values[token] || '—'}</code>
						</td>
						<td>{usage}</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
}
