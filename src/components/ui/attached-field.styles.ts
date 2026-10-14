import styled from '@emotion/styled';

export const Group = styled.div`
	display: grid;

	/* The outline MUI draws inherits the root's radius, so squaring the root squares both. */
	&[data-attached='true'] > .anchor .MuiOutlinedInput-root {
		border-end-start-radius: 0;
		border-end-end-radius: 0;
	}

	.strip,
	.row {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		background: var(--color-surface-soft);
	}

	&[data-attached='true'] .strip,
	&[data-attached='true'] .row {
		border-top: 0;
		border-start-start-radius: 0;
		border-start-end-radius: 0;
	}

	/*
	 * The strip is drawn 32px tall to stay out of the way, but the button around it is a full 44px
	 * touch target; the transparent rest of it reaches into the gap below.
	 */
	.offer {
		box-sizing: border-box;
		height: 44px;
		margin: 0 0 -12px;
		padding: 0 0 12px;
		border: 0;
		background: none;
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	.offer:focus-visible {
		outline: 0;
	}

	.offer:focus-visible .strip {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}

	.strip {
		gap: 6px;
		height: 32px;
		padding-inline: 12px 10px;
		font-size: 13px;
		font-weight: 500;
	}

	.strip .text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.strip .value {
		color: var(--color-text);
	}

	svg {
		flex-shrink: 0;
		font-size: 18px;
	}

	.row {
		gap: 8px;
		height: 48px;
		padding-inline: 14px 0;
	}

	.row:has(input:focus-visible) {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}

	.row label {
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
	}

	.row input {
		flex: 1;
		min-width: 0;
		height: 100%;
		padding: 0;
		border: 0;
		color: var(--color-text);
		background: none;
		font-family: var(--font-body);
		/* 16px keeps a phone from zooming in on focus. */
		font-size: 16px;
	}

	.row input:focus-visible {
		outline: 0;
	}

	.collapse {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		color: inherit;
		background: none;
		cursor: pointer;
	}

	.collapse svg {
		transform: rotate(180deg);
	}

	.hint {
		margin: 6px 0 0;
		padding-inline: 14px;
		color: var(--color-text-subtle);
		font-size: 12px;
		line-height: 1.4;
	}
`;
