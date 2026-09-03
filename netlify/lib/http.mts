import { Hono, type Env } from 'hono';
import { HTTPException } from 'hono/http-exception';

export function jsonError(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

export async function jsonBody(request: Request): Promise<unknown> {
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
	// Hono otherwise dispatches HEAD to GET, which can query or update market state.
	return async (request: Request) =>
		request.method === 'HEAD' ? methodNotAllowed() : app.fetch(request);
}
