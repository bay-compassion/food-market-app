#!/usr/bin/env node

import { parseArgs } from 'node:util';

import { TwilioSmsTransport } from '../netlify/services/sms-transport.mjs';

const usage = `Usage: npm run sms:smoke -- --to=+15551234567 [--to=+15557654321] --send

Submits one or two live SMS messages directly through the configured Twilio Messaging Service.
This bypasses the database, notification queue, market lifecycle, and Async Workloads.

Options:
  --to=NUMBER  Recipient in E.164 format. May be provided twice.
  --send       Required acknowledgement that this command sends and may incur charges.
  --help       Show this message without sending.
`;

function maskPhone(phone: string) {
	return `…${phone.slice(-4)}`;
}

async function main() {
	const { values } = parseArgs({
		options: {
			to: { type: 'string', multiple: true },
			send: { type: 'boolean', default: false },
			help: { type: 'boolean', default: false },
		},
	});

	if (values.help) {
		console.log(usage);

		return;
	}

	const recipients = [...new Set(values.to ?? [])];

	if (recipients.length < 1 || recipients.length > 2) {
		throw new Error('Provide one or two --to recipients.');
	}

	for (const recipient of recipients) {
		if (!/^\+[1-9]\d{7,14}$/.test(recipient)) {
			throw new Error(`Recipient ${maskPhone(recipient)} is not in E.164 format.`);
		}
	}

	if (!values.send) {
		throw new Error('Refusing to send without the explicit --send acknowledgement.');
	}

	const transport = TwilioSmsTransport.fromEnvironment();

	if (!transport) {
		throw new Error(
			'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID are required.',
		);
	}

	for (const recipient of recipients) {
		const result = await transport.send({
			to: recipient,
			body: 'Bay Compassion SMS test: notification delivery is configured correctly.',
		});

		console.log(`Submitted test SMS to ${maskPhone(recipient)} (${result.providerMessageId}).`);
	}
}

try {
	await main();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
