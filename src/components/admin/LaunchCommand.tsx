import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { useId, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

const Command = styled.div`
	display: grid;
	gap: 8px;
	justify-items: start;

	.label {
		margin: 0;
		font-size: 13px;
		font-weight: 700;
	}

	pre {
		justify-self: stretch;
		margin: 0;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--color-surface-soft);
		font-size: 12px;
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.how {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 13px;
		line-height: 1.5;
	}
`;

/**
 * A Terminal command for the printing station's computer, with a button to copy it and how to run
 * it, since the person at that computer may never have opened Terminal.
 */
export function LaunchCommand({ label, command }: { label: string; command: string }) {
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
			<Button variant="outlined" onClick={() => void copy()} aria-describedby={labelId}>
				{copied ? t.copied : t.copy}
			</Button>
			<p className="how">{t.runCommand}</p>
		</Command>
	);
}
