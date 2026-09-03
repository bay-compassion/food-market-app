/**
 * Vocabulary for the dev-mode fake data loader: lets an authorized user snap the current session
 * straight into any point on the lifecycle in `sessionStateMachine.ts`, for demos and screenshots.
 *
 * `service_started` covers the most ground of any status — nobody called yet, all the way through
 * to nearly done — so it takes an extra parameter naming how far along the queue is. Shared between
 * the browser (`DevModeView.vue`, to render the buttons) and the server
 * (`netlify/routes/demo/demo-data.mts`, to validate the request body), the same way `sessionStatuses`
 * itself is shared.
 */
export const serviceProgressLevels = ['just_started', 'halfway', 'nearly_done'] as const;

export type ServiceProgress = (typeof serviceProgressLevels)[number];

export function isServiceProgress(value: unknown): value is ServiceProgress {
	return serviceProgressLevels.includes(value as ServiceProgress);
}
