import styled from '@emotion/styled';
import { TableRow } from '@mui/material';

export const GuestTableRow = styled(TableRow)`
	.identity {
		display: grid;
		gap: 3px;
		min-width: 0;
	}

	.name {
		display: flex;
		gap: 8px;
		align-items: center;
		font-size: 16px;
		font-weight: 700;
		line-height: 1.3;
	}

	.queue-number {
		display: inline-grid;
		flex: 0 0 auto;
		place-items: center;
		min-width: 24px;
		height: 24px;
		padding: 0 6px;
		border-radius: var(--radius-pill);
		color: var(--color-on-brand);
		background: var(--color-brand);
		font-size: 12px;
	}

	.status-chip {
		padding: 2px 8px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-soft);
		color: var(--color-text-muted);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.details {
		display: flex;
		flex-wrap: wrap;
		gap: 2px 0;
		color: var(--color-text-subtle);
		font-size: 13px;
		line-height: 1.35;
	}

	.details > span + span::before {
		content: '·';
		margin: 0 6px;
	}

	/* Hugs its content so the identity cell takes whatever width is left. */
	.actions-cell {
		width: 1%;
		padding-inline-start: 12px;
		white-space: nowrap;
	}

	.actions {
		display: flex;
		gap: 8px;
		align-items: center;
		justify-content: flex-end;
	}

	.waiting-time {
		color: var(--color-text-muted);
		font-size: 13px;
		font-weight: 700;
	}
`;
