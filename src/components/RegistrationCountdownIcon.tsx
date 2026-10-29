import styled from '@emotion/styled';

const Icon = styled.svg`
	flex: 0 0 auto;
	width: 14px;
	height: 14px;
`;

/**
 * The strip's non-color signal for which phase it is in, since color alone doesn't reliably read
 * for red-green color blindness: an hourglass while waiting for registration to open, a check the
 * moment it does, and a warning once the closing clock starts to run out.
 */
export function RegistrationCountdownIcon({ kind }: { kind: 'waiting' | 'opened' | 'warning' }) {
	return (
		<Icon
			className={`registration-countdown-icon registration-countdown-icon-${kind}`}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{kind === 'waiting' ? (
				<path d="M6 3h12M6 21h12M7 3v3l5 6-5 6v3M17 3v3l-5 6 5 6v3" />
			) : kind === 'opened' ? (
				<path d="m5 12.5 4.5 4.5L19 7.5" />
			) : (
				<>
					<path d="M12 3 2 20h20L12 3Z" />
					<path d="M12 10v4" />
					<path d="M12 17h.01" />
				</>
			)}
		</Icon>
	);
}
