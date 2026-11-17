import styled from '@emotion/styled';

/**
 * A ticket's row of pill buttons and links — what can be done with the open ticket. `.primary`
 * fills the likely next step.
 */
export const TicketActionBar = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;

	button,
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 16px;
		border: 0;
		border-radius: var(--radius-pill);
		color: var(--color-text);
		background: var(--color-surface-soft);
		font-size: 15px;
		font-weight: 700;
		text-decoration: none;
	}

	.primary {
		color: var(--color-on-brand);
		background: var(--color-success);
	}

	button:disabled {
		opacity: 0.6;
	}
`;
