import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { useId, useState, type ReactNode } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

const Command = styled.div`
	display: grid;
	gap: 8px;
	width: 100%;
	min-width: 0;

	.label {
		margin: 0;
		font-size: 13px;
		font-weight: 700;
	}

	pre {
		margin: 0;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--color-surface-soft);
		font-size: 12px;
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.copy {
		justify-self: start;
	}

	.how {
		display: grid;
		gap: 6px;
		margin-top: 6px;
		font-size: 14px;
	}

	h4 {
		margin: 0;
		font-size: 14px;
	}

	ol {
		display: grid;
		gap: 6px;
		margin: 0;
		padding-inline-start: 20px;
		color: var(--color-text-muted);
		line-height: 1.45;
	}
`;

export type LaunchCommandProps = {
	label: string;
	command: string;
	/** Anything more, after how to run it. */
	children?: ReactNode;
};

/**
 * A Terminal command for the printing station's iMac, with a button to copy it and how to run it,
 * for someone who may never have opened Terminal. Only ever shown inside When You Need It, so it
 * stays out of the way on a normal market day.
 */
export function LaunchCommand({ label, command, children }: LaunchCommandProps) {
	const t = adminTranslations.en.printStationCard;
	const { notifications } = useRootStore();
	const [copied, setCopied] = useState(false);
	const labelId = useId();

	async function copy() {
		try {
			await navigator.clipboard.writeText(command);
			setCopied(true);
		} catch {
			notifications.error(t.copyFailed);
		}
	}

	return (
		<Command>
			<p className="label" id={labelId}>
				{label}
			</p>
			<pre aria-labelledby={labelId}>{command}</pre>
			<Button
				className="copy"
				variant="outlined"
				onClick={() => void copy()}
				aria-describedby={labelId}
			>
				{copied ? t.copied : t.copy}
			</Button>
			<div className="how">
				<h4>{t.runCommandTitle}</h4>
				<ol>
					{t.runCommandSteps.map((step) => (
						<li key={step}>{step}</li>
					))}
				</ol>
			</div>
			{children}
		</Command>
	);
}
