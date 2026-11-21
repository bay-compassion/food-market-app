import styled from '@emotion/styled';

import { createQrCodeSvg } from '../services/qrCode';
import { BackButton } from './ui/BackButton';

const Page = styled.section`
	display: grid;
	justify-items: center;
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 24px 0 48px;
	text-align: center;

	h1 {
		margin-bottom: 6px;
		color: var(--color-brand);
		font-family: var(--font-heading);
		font-size: 30px;
		letter-spacing: var(--tracking-heading);
		text-transform: uppercase;
	}

	.qr-page-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-bottom: 20px;
	}

	.qr-back,
	.qr-print {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0;
		border: 0;
		color: var(--color-brand);
		background: transparent;
		font-weight: 700;
		font-size: 15px;
	}

	.qr-back svg,
	.qr-print svg {
		width: 18px;
	}

	.qr-description {
		max-width: 420px;
		margin-bottom: 28px;
		color: var(--color-text-muted);
		font-size: 16px;
		line-height: 1.6;
	}

	.qr-code {
		width: min(100%, 320px);
		padding: 20px;
		border: 2px solid var(--color-brand);
		border-radius: var(--radius-lg);
		background: white;
	}

	.qr-code svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.qr-url {
		margin-top: 20px;
		overflow-wrap: anywhere;
		color: var(--color-text-subtle);
		font-size: 14px;
	}

	@media print {
		width: 100%;
		padding: 0;

		.qr-page-controls {
			display: none;
		}

		.qr-code {
			width: min(100%, 90mm);
			border-color: black;
			break-inside: avoid;
		}
	}
`;

export type QrPosterProps = {
	/** The address the code opens, printed beneath it for anyone who cannot scan. */
	url: string;
	title: string;
	description: string;
	imageAlt: string;
	backLabel: string;
	onBack: () => void;
	printLabel: string;
};

/**
 * A printable poster: a heading, a line on what scanning does, the QR code, and its address. The
 * Back and Print controls show on screen only. The route rendering it also hides the app bar when
 * printing (see `App`), so the page prints as the poster alone.
 *
 * Text arrives as props because the guest poster is localized and the staff one is not.
 */
export function QrPoster({
	url,
	title,
	description,
	imageAlt,
	backLabel,
	onBack,
	printLabel,
}: QrPosterProps) {
	return (
		<Page className="qr-page">
			<div className="qr-page-controls">
				<BackButton className="qr-back" label={backLabel} onClick={onBack} />
				<button type="button" className="qr-print" onClick={() => window.print()}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden="true"
					>
						<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2" />
						<rect x="6" y="14" width="12" height="7" />
					</svg>
					{printLabel}
				</button>
			</div>
			<h1>{title}</h1>
			<p className="qr-description">{description}</p>
			{/* `createQrCodeSvg` renders a URL this app builds, never anything a user supplies. */}
			<div
				className="qr-code"
				role="img"
				aria-label={imageAlt}
				dangerouslySetInnerHTML={{ __html: createQrCodeSvg(url) }}
			/>
			<p className="qr-url">{url}</p>
		</Page>
	);
}
