import { Hono, type Env } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';

export const maxRequestBodyBytes = 32 * 1024;

export function jsonError(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

export async function jsonBody(request: Request): Promise<unknown> {
	const contentType = request.headers.get('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase();

	if (contentType !== 'application/json') {
		throw new HTTPException(415, {
			res: jsonError('Request body must use application/json.', 415),
		});
	}

	try {
		return await request.json();
	} catch {
		throw new HTTPException(400, {
			res: jsonError('Request body must be valid JSON.'),
		});
	}
}

export function createRouter<E extends Env = Env>() {
	const app = new Hono<E>();

	app.onError((error) => {
		if (error instanceof HTTPException) {
			return error.getResponse();
		}

		// Preserve Netlify's invocation failure reporting for unexpected service errors.
		throw error;
	});
	app.notFound(() => jsonError('Not found.', 404));

	return app;
}

export function methodNotAllowed() {
	return jsonError('Method not allowed', 405);
}

export function routeHandler<E extends Env>(app: Hono<E>) {
	// Apply transport policy once, outside the nested feature routers. Netlify supplies HSTS.
	const boundary = createRouter();

	boundary.use('*', secureHeaders({ strictTransportSecurity: false, xFrameOptions: 'DENY' }));
	boundary.use('*', async (context, next) => {
		await next();
		// Includes credentials, personal data, exports, and authentication/validation failures.
		context.header('Cache-Control', 'no-store');
	});
	boundary.use(
		'*',
		bodyLimit({
			maxSize: maxRequestBodyBytes,
			onError: () => jsonError('Request body is too large.', 413),
		}),
	);
	boundary.all('*', (context) =>
		// Hono otherwise dispatches HEAD to GET, which can query or update market state.
		context.req.method === 'HEAD' ? methodNotAllowed() : app.fetch(context.req.raw),
	);

	return async (request: Request) => boundary.fetch(request);
}
