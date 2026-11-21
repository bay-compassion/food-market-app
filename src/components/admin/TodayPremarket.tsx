import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { useId } from 'react';

import { adminTranslations } from '../../adminLocales';
import { premarketUrl } from '../../services/premarket';
import { createQrCodeSvg } from '../../services/qrCode';
import { useRootStore } from '../../stores/react/store-context';
import { TodaySection } from './today-section.styles';

const Code = styled.details`
	summary {
		width: fit-content;
		color: var(--color-brand-dark);
		font-weight: 700;
		cursor: pointer;
	}

	.qr {
		width: min(100%, 260px);
		margin-top: 10px;
		padding: 12px;
		border: 1px solid var(--color-border-soft);
		border-radius: var(--radius-md);
		background: white;
	}

	.qr svg {
		display: block;
		width: 100%;
		height: auto;
	}
`;

const Link = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;

	input {
		flex: 1 1 220px;
		min-width: 0;
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font: inherit;
		font-size: 14px;
	}
`;

/**
 * The premarket on the Today screen: the QR code volunteers scan to check in, and its link to copy
 * and share. The address is the same every week, so a printed copy keeps working.
 */
export function TodayPremarket() {
	const t = adminTranslations.en.today;
	const { notifications } = useRootStore();
	const headingId = useId();
	const link = premarketUrl(window.location.origin);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(link);
			notifications.success(t.premarketLinkCopied);
		} catch {
			notifications.error(t.premarketLinkNotCopied);
		}
	}

	return (
		<TodaySection aria-labelledby={headingId}>
			<div className="heading">
				<h2 id={headingId}>{t.premarket}</h2>
			</div>
			<p>{t.premarketHelp}</p>
			<Code>
				<summary>{t.showPremarketCode}</summary>
				{/* Built from a URL this app makes, never from input. */}
				<div
					className="qr"
					role="img"
					aria-label={t.premarketCode}
					dangerouslySetInnerHTML={{ __html: createQrCodeSvg(link) }}
				/>
			</Code>
			<Link>
				<input
					readOnly
					aria-label={t.premarketLink}
					value={link}
					onFocus={(event) => event.currentTarget.select()}
				/>
				<Button variant="outlined" onClick={() => void copyLink()}>
					{t.copyPremarketLink}
				</Button>
			</Link>
		</TodaySection>
	);
}
