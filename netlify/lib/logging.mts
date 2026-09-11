import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Writable } from 'node:stream';

import type { Context } from '@netlify/functions';
import winston, { type Logger } from 'winston';

const levels = new Set(Object.keys(winston.config.npm.levels));
const context = new AsyncLocalStorage<Logger>();

function loggingSettings() {
	const requestedLevel = process.env.LOG_LEVEL?.trim().toLowerCase() ?? 'info';

	return {
		level: levels.has(requestedLevel) ? requestedLevel : 'info',
		silent: requestedLevel === 'silent',
	};
}

/** Database and provider errors can contain credentials or guest data in their messages. */
function serializeError(error: unknown) {
	if (!(error instanceof Error)) {
		return { type: 'NonError' };
	}

	return {
		type: error.constructor.name,
		stack: error.stack
			?.split('\n')
			.filter((line) => /^\s+at /.test(line))
			.join('\n'),
	};
}

const sanitize = winston.format((info) => {
	// Defense in depth; callers should log operational metadata, never request objects.
	for (const key of [
		'req',
		'res',
		'headers',
		'body',
		'authorization',
		'cookie',
		'token',
		'phone',
		'email',
	]) {
		delete info[key];
	}

	if ('err' in info) {
		info.err = serializeError(info.err);
	}

	return info;
});

export function createLogger(destination?: Writable) {
	const { level, silent } = loggingSettings();

	return winston.createLogger({
		level,
		silent,
		defaultMeta: { service: 'bay-compassion-backend' },
		format: winston.format.combine(sanitize(), winston.format.timestamp(), winston.format.json()),
		// Write directly to the platform's console; no file or background network transport.
		transports: [
			destination
				? new winston.transports.Stream({ stream: destination })
				: new winston.transports.Console(),
		],
	});
}

export function createSmsLogger(destination?: Writable) {
	const { level, silent } = loggingSettings();
	const filename = process.env.SMS_LOG_FILE ?? 'logs/sms.log';
	const serverlessRuntime = Boolean(
		process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT,
	);
	const transport = destination
		? new winston.transports.Stream({ stream: destination })
		: serverlessRuntime
			? new winston.transports.Console()
			: new winston.transports.File({ filename });

	return winston.createLogger({
		level,
		silent,
		defaultMeta: { service: 'bay-compassion-backend', channel: 'sms' },
		format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
		transports: [transport],
	});
}

let smsLogger: Logger | undefined;

export function getSmsLogger() {
	return (smsLogger ??= createSmsLogger());
}

export function obfuscatePhoneNumber(phone: string) {
	return `••••${phone.slice(-4)}`;
}

export function logSmsDelivery(phone: string, content: string, log = getSmsLogger()) {
	const recipient = obfuscatePhoneNumber(phone);

	log.info({ message: 'sms.delivery.attempted', recipient });
	log.debug({ message: 'sms.delivery.content', recipient, content });
}

const logger = createLogger();

export function getLogger() {
	return context.getStore() ?? logger;
}

export function withLogger<T>(logger: Logger, callback: () => T): T {
	return context.run(logger, callback);
}

export type InvocationContext = Pick<Context, 'requestId'>;

export function invocationLogger(functionName: string, invocation?: InvocationContext) {
	const requestId = invocation?.requestId ?? randomUUID();

	return { log: getLogger().child({ function: functionName, requestId }), requestId };
}

export function loggedJob(name: string, job: () => Promise<void>) {
	return async (_request?: Request, invocation?: InvocationContext) => {
		const { log } = invocationLogger(name, invocation);
		const started = performance.now();

		return withLogger(log, async () => {
			try {
				await job();
				log.info({ message: 'job.completed', durationMs: performance.now() - started });
			} catch (err) {
				log.error({ message: 'job.failed', durationMs: performance.now() - started, err });
				throw err;
			}
		});
	};
}
