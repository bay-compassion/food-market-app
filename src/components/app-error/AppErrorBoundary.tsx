import { Component, type ReactNode } from 'react';

import { AppErrorPage } from './AppErrorPage';

type AppErrorBoundaryProps = {
	children: ReactNode;
};

/**
 * The last line of defence: catches a render error anywhere above the router — the theme, Auth0,
 * LaunchDarkly — which would otherwise unmount the whole tree and leave a blank page. Errors inside
 * a route are caught first by the router's own `errorElement` (`router.tsx`), which shows the same
 * page.
 *
 * Reporting is not this component's job: `createRoot`'s `onCaughtError` hands every error a
 * boundary catches to Sentry.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, { failed: boolean }> {
	override state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	override render() {
		return this.state.failed ? <AppErrorPage /> : this.props.children;
	}
}
