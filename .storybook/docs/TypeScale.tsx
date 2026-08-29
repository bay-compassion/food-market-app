import styled from '@emotion/styled';

import type { TypeScaleProps } from './types';
import { useTokenValues } from './use-token-values';

const Scale = styled.div`
	.family {
		margin-bottom: 8px;
		color: var(--color-text-subtle);
		font-size: 13px;
	}

	.sample {
		padding: 18px 0;
		border-bottom: 1px solid #eef2f0;
	}

	.specimen {
		color: var(--color-text);
		line-height: 1.2;
	}

	.caption {
		margin-top: 8px;
		color: var(--color-text-subtle);
		font-size: 13px;
	}
`;

/** One font family's sizes, each shown at the size it is actually used at. */
export function TypeScale({ token, samples }: TypeScaleProps) {
	const values = useTokenValues([token]);

	return (
		<Scale>
			<p className="family">
				<code>{token}</code> — {values[token] || '…'}
			</p>
			{samples.map((sample) => (
				<div key={sample.size + sample.usage} className="sample">
					<p
						className="specimen"
						style={{
							fontFamily: `var(${token})`,
							fontSize: sample.size,
							fontWeight: sample.weight,
							textTransform: sample.uppercase ? 'uppercase' : 'none',
						}}
					>
						{sample.text}
					</p>
					<p className="caption">
						{sample.size} · {sample.weight} · {sample.usage}
					</p>
				</div>
			))}
		</Scale>
	);
}
