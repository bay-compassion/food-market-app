import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';

const Troubleshooting = styled.section`
	display: grid;
	gap: 10px;

	h4,
	dl,
	dd {
		margin: 0;
	}

	h4 {
		font-size: 16px;
	}

	dl {
		display: grid;
		gap: 10px;
	}

	dt {
		font-weight: 700;
	}

	dd {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}
`;

/** The printing station's usual failures, each with what to do about it. */
export function PrintStationTroubleshooting() {
	const t = adminTranslations.en.printStationCard;

	return (
		<Troubleshooting>
			<h4>{t.troubleshootingTitle}</h4>
			<dl>
				{t.troubleshooting.map(({ problem, fix }) => (
					<div key={problem}>
						<dt>{problem}</dt>
						<dd>{fix}</dd>
					</div>
				))}
			</dl>
		</Troubleshooting>
	);
}
