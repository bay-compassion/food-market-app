import styled from '@emotion/styled';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'error';

export type AlertProps = {
	severity?: AlertSeverity;
	heading: string;
	body: string;
	/** Overrides the default glyph shown for the severity, e.g. a custom character or emoji. */
	icon?: string;
};

const defaultIcons: Record<AlertSeverity, string> = {
	info: 'ℹ',
	success: '✓',
	warning: '!',
	error: '✕',
};

/** The token each severity colours its icon and heading with. */
const severityColors: Record<AlertSeverity, string> = {
	info: 'var(--color-brand)',
	success: 'var(--color-success)',
	warning: 'var(--color-warning)',
	error: 'var(--color-error)',
};

const Container = styled.div<{ $severity: AlertSeverity }>`
	display: flex;
	gap: 14px;
	margin-bottom: 24px;
	padding: 16px 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);

	.alert-icon {
		background: ${({ $severity }) => severityColors[$severity]};
	}

	.alert-heading {
		color: ${({ $severity }) => severityColors[$severity]};
	}
`;

const Icon = styled.span`
	display: grid;
	flex: 0 0 auto;
	width: 32px;
	height: 32px;
	place-items: center;
	border-radius: 50%;
	color: var(--color-on-brand);
	font-size: 16px;
	font-weight: 700;
`;

const Text = styled.div`
	display: grid;
	gap: 4px;
`;

const Heading = styled.p`
	font-size: 15px;
	font-weight: 700;
`;

const Body = styled.p`
	color: var(--color-text-muted);
	font-size: 14px;
	line-height: 1.5;
`;

/** A short, coloured notice: a heading, a line of detail, and a severity glyph. */
export function Alert({ severity = 'info', heading, body, icon }: AlertProps) {
	return (
		<Container className={`alert ${severity}`} $severity={severity}>
			<Icon className="alert-icon" aria-hidden="true">
				{icon ?? defaultIcons[severity]}
			</Icon>
			<Text className="alert-text">
				<Heading className="alert-heading">{heading}</Heading>
				<Body className="alert-body">{body}</Body>
			</Text>
		</Container>
	);
}
