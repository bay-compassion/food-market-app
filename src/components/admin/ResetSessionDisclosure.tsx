import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';

const Disclosure = styled.section`
	border-top: 1px solid var(--color-divider);

	.toggle {
		display: flex;
		width: 100%;
		min-height: 48px;
		align-items: center;
		justify-content: space-between;
		padding: 0;
		border: 0;
		color: var(--color-text-muted);
		background: transparent;
		font: inherit;
		font-size: 15px;
		font-weight: 500;
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
		gap: 12px;
		padding-bottom: 12px;
	}

	.body h2,
	.body p {
		margin: 0;
	}

	.body h2 {
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: 700;
		text-transform: none;
	}

	.body p {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}
`;

export type ResetSessionDisclosureProps = {
	busy?: boolean;
	onReset: () => void;
};

/**
 * Reset is for a session that went wrong, and it does not set up the next one, which makes it the
 * wrong way to finish a normal day. So it stays out of sight until somebody asks for it.
 */
export function ResetSessionDisclosure({ busy, onReset }: ResetSessionDisclosureProps) {
	const t = adminTranslations.en;
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Disclosure>
			<button
				type="button"
				className="toggle"
				aria-expanded={isOpen}
				onClick={() => setIsOpen(!isOpen)}
			>
				<span>{t.today.somethingWrong}</span>
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
					<path d="M6 9l6 6 6-6" />
				</svg>
			</button>
			{isOpen ? (
				<div className="body">
					<h2>{t.resetSession}</h2>
					<p>{t.resetSessionHelp}</p>
					<Button type="button" variant="outlined" color="error" disabled={busy} onClick={onReset}>
						{t.resetSession}
					</Button>
				</div>
			) : null}
		</Disclosure>
	);
}
