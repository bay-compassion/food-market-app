import styled from '@emotion/styled';
import { useMemo } from 'react';

import { createQrCodeSvg } from '../../services/qrCode';
import { standbyUrl } from '../../services/standby';
import { Bilingual, useKioskLanguages } from './kiosk-languages';
import { KioskHeader } from './KioskHeader';
import { LanguageIndicator } from './LanguageIndicator';

const Layout = styled.section`
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4vmin;
	text-align: center;

	h1 {
		max-width: 24ch;
		margin: 0;
		font-size: clamp(1.8rem, 6vmin, 5rem);
		font-weight: 700;
		line-height: 1.2;
		text-align: center;
	}
`;

/* A quiet zone of white all round, as a scanner needs, whatever the frame's own colors. */
const Code = styled.div`
	width: min(60vmin, 80vw);
	padding: 3vmin;
	border-radius: var(--radius-lg);
	background: #fff;

	svg {
		display: block;
		width: 100%;
		height: auto;
	}
`;

/**
 * What a standby iPad shows once standby has opened: the session's code, as a QR code a guest scans
 * with their own phone to pull a ticket, under a line saying what it is for. The code is the same
 * all session; see `docs/standby.md`.
 */
export function StandbyCodeScreen({ code }: { code: string }) {
	// The SVG comes from our own QR encoder, never from anything a guest typed.
	const svg = useMemo(() => createQrCodeSvg(standbyUrl(window.location.origin, code)), [code]);
	const { primary } = useKioskLanguages();

	return (
		<>
			<KioskHeader />
			<Layout>
				<h1>
					<Bilingual text={(copy) => copy.standbyScan} />
				</h1>
				<Code
					role="img"
					aria-label={primary.copy.standbyScan}
					dangerouslySetInnerHTML={{ __html: svg }}
				/>
			</Layout>
			<LanguageIndicator />
		</>
	);
}
