import styled from '@emotion/styled';
import { marked } from 'marked';
import { useMemo, type MouseEvent } from 'react';

export type LegalDocumentViewProps = {
	backLabel: string;
	markdown: string;
	/** Where the back link points. Kept a real href so it can be opened in a new tab. */
	backHref?: string;
	/** Routes the plain left-click without a page load. Omit and the href is followed normally. */
	onBack?: () => void;
};

const Page = styled.section`
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 24px 0 48px;
`;

const BackLink = styled.a`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 20px;
	padding: 0;
	border: 0;
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
	font-size: 15px;

	svg {
		width: 18px;
	}
`;

/**
 * The rendered document. These are descendant selectors rather than styled children because the
 * markup comes from `marked` as a string, so there is nothing here to attach a class to — the
 * same reason the Vue original reached for `:deep()`.
 */
const Content = styled.div`
	h1 {
		margin-bottom: 6px;
		color: var(--color-brand);
		font-family: var(--font-heading);
		font-size: 30px;
		letter-spacing: -0.01em;
		text-transform: uppercase;
	}

	h2 {
		margin-top: 28px;
		margin-bottom: 10px;
		color: var(--color-brand);
		font-family: var(--font-heading);
		font-size: 19px;
		letter-spacing: -0.005em;
	}

	p {
		margin-bottom: 14px;
		color: var(--color-text);
		font-size: 16px;
		line-height: 1.6;
	}

	ul {
		margin: 0 0 14px;
		padding-left: 20px;
	}

	li {
		margin-bottom: 10px;
		color: var(--color-text);
		font-size: 16px;
		line-height: 1.6;
	}

	a {
		color: var(--color-brand);
	}

	hr {
		margin: 24px 0;
		border: 0;
		border-top: 1px solid var(--color-border);
	}

	em {
		display: block;
		margin-top: 8px;
		color: var(--color-text-subtle);
		font-size: 13px;
		line-height: 1.5;
	}
`;

/** Whether a click is the plain left-click that in-app routing should handle. */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
	return (
		event.button === 0 &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.shiftKey &&
		!event.altKey &&
		!event.defaultPrevented
	);
}

/**
 * The privacy policy and terms, rendered from the Markdown they are authored in.
 *
 * The Markdown is repository content compiled in at build time, never anything a guest submits,
 * so rendering it as HTML introduces no injection surface.
 */
export function LegalDocumentView({
	backLabel,
	markdown,
	backHref = '/',
	onBack,
}: LegalDocumentViewProps) {
	const html = useMemo(() => marked.parse(markdown, { async: false, breaks: true }), [markdown]);

	function handleBack(event: MouseEvent<HTMLAnchorElement>) {
		if (!onBack || !isPlainClick(event)) {
			return;
		}

		event.preventDefault();
		onBack();
	}

	return (
		<Page className="legal-page">
			<BackLink className="legal-back" href={backHref} onClick={handleBack}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M15 18l-6-6 6-6" />
				</svg>
				{backLabel}
			</BackLink>
			<Content className="legal-content" dangerouslySetInnerHTML={{ __html: html }} />
		</Page>
	);
}
