import styled from '@emotion/styled';
import Button from '@mui/material/Button';
import { observer } from 'mobx-react-lite';
import { useId, useState } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';

const Field = styled.section`
	display: grid;
	gap: 8px;
`;

const Header = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
`;

const Label = styled.h3`
	margin: 0;
	color: var(--color-text);
	font-size: 16px;
	font-weight: 700;
`;

const Value = styled.code`
	display: block;
	padding: 14px;
	overflow-wrap: anywhere;
	border-radius: var(--radius-sm);
	color: var(--color-brand-dark);
	background: var(--color-surface-soft);
	font-size: 14px;
	line-height: 1.5;
	direction: ltr;
	text-align: start;
`;

const Hint = styled.p`
	margin: 0;
	color: var(--color-text-muted);
	font-size: 14px;
	line-height: 1.4;
`;

type CopyableValueProps = {
	label: string;
	value: string;
	/** The Copy button's accessible name, which says what it copies (`Copy device ID`). */
	copyLabel: string;
	hint?: string;
};

/** One labelled value a guest can read out or copy to the clipboard, as on the device details. */
export const CopyableValue = observer(function CopyableValue({
	label,
	value,
	copyLabel,
	hint,
}: CopyableValueProps) {
	const {
		appBar: { deviceDetails: t },
	} = useTranslation();
	const { notifications } = useRootStore();
	const [copied, setCopied] = useState(false);
	const labelId = useId();

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
		} catch {
			notifications.error(t.copyError);
		}
	}

	return (
		<Field aria-labelledby={labelId}>
			<Header>
				<Label id={labelId}>{label}</Label>
				{/* Named for what it copies until it has, then by its visible "Copied" confirmation. */}
				<Button
					size="small"
					aria-label={copied ? undefined : copyLabel}
					onClick={() => void copy()}
				>
					{copied ? t.copied : t.copy}
				</Button>
			</Header>
			<Value>{value}</Value>
			{hint ? <Hint>{hint}</Hint> : null}
		</Field>
	);
});
