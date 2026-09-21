import styled from '@emotion/styled';

import type { SmsMessageParts } from '../../src/services/notification-copy';

const Message = styled.figure`
	max-width: 340px;
	margin: 0 auto;
	padding: 20px 20px 22px;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;

	.kind {
		margin: 0 0 12px;
		color: #6b6b6b;
		font-size: 12px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.bubble {
		margin: 0;
		padding: 12px 15px;
		border-radius: 20px;
		background: #e9e9eb;
		color: #111;
		font-size: 17px;
		line-height: 1.4;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.required {
		padding: 1px 3px;
		border-radius: 3px;
		background: #ffd86b;
		box-decoration-break: clone;
	}

	.key {
		display: grid;
		gap: 10px;
		margin: 26px 0 0;
		padding: 0;
		color: #333;
		font-size: 13px;
		list-style: none;
	}

	.key li {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.swatch {
		flex: none;
		width: 18px;
		height: 18px;
		margin-top: 1px;
		border: 1px solid #999;
		border-radius: 3px;
		background: #e9e9eb;
	}

	.swatch.required {
		background: #ffd86b;
	}
`;

/**
 * A text message as a guest receives it, with the currently fixed parts shaded.
 *
 * It is drawn from the parts `smsMessage` joins, so it cannot disagree with what is sent. The shaded
 * parts are marked `data-required` for the story that checks the current prefix and unsubscribe line.
 * Both are still English in every language, so they stay left-to-right inside a right-to-left
 * message. Only STOP must remain English when the opt-out wording is localized.
 */
export function TextMessage({ parts }: { parts: SmsMessageParts }) {
	const required = (text: string) => (
		<bdi dir="ltr" className="required" data-required>
			{text}
		</bdi>
	);

	return (
		<Message>
			<figcaption className="kind">Text message</figcaption>
			<p className="bubble">
				{required(parts.prefix)}
				{parts.title}
				{'\n\n'}
				{parts.body}
				{parts.position === null ? '' : `\n${parts.position}`}
				{'\n\n'}
				{required(parts.unsubscribe)}
			</p>
			<ul className="key">
				<li>
					<span className="swatch required" />
					<span>
						<b>Currently fixed</b> in every text message. Only STOP must stay in English.
					</span>
				</li>
				<li>
					<span className="swatch" />
					<span>Message content.</span>
				</li>
			</ul>
		</Message>
	);
}
