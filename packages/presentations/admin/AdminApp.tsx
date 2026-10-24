import { ThemeProvider } from '@mui/material/styles';
import { observer } from 'mobx-react-lite';
import { MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router';

import { isAdminView, type AdminView } from '../../../src/components/admin/types.ts';
import { AdminDashboard } from '../../../src/components/AdminDashboard.tsx';
import { AppThemeProvider } from '../../../src/components/AppThemeProvider.tsx';
import { StaticLDProvider } from '../../../src/components/StaticLDProvider.tsx';
import { AppBar } from '../../../src/components/ui/app-bar/AppBar.tsx';
import { ConfirmationDrawer } from '../../../src/components/ui/ConfirmationDrawer.tsx';
import { RootStoreProvider, useRootStore } from '../../../src/stores/react/store-context.tsx';
import type { RootStore } from '../../../src/stores/root.store.ts';
import { still } from '../phone/PhoneApp.tsx';

/** A token for the frame's server, which reads none. Stable, as the dashboard's effects need. */
const accessToken = async () => 'guide';

/**
 * The admin area as `App` and its routes lay it out — the bar, then the dashboard at `/admin/:view`
 * — inside the same providers `main.tsx` mounts, but with the store handed in and Auth0 left out
 * (`AdminAuthView`'s gate, as the full-stack rig's `e2e-queue/admin-entry.tsx` leaves it out). The
 * confirmation sheet is mounted as `App` mounts it; toasts are not, since a transient message
 * would show on one way of reaching a moment and not another. The content scrolls under the bar
 * inside `.phone-scroll`, which the frame moves to keep what the narration points at in view.
 */
export function AdminApp({ store, view }: { store: RootStore; view: AdminView }) {
	return (
		<AppThemeProvider mode="light">
			<ThemeProvider theme={still}>
				<StaticLDProvider>
					<RootStoreProvider store={store}>
						<MemoryRouter initialEntries={[`/admin/${view}`]}>
							<AdminShell />
						</MemoryRouter>
					</RootStoreProvider>
				</StaticLDProvider>
			</ThemeProvider>
		</AppThemeProvider>
	);
}

const AdminShell = observer(function AdminShell() {
	const { translations } = useRootStore();

	return (
		<main className="app-shell" dir={translations.dir}>
			<AppBar />
			<div className="phone-scroll">
				<Routes>
					<Route path="/admin/:view" element={<AdminScreen />} />
				</Routes>
			</div>
			<ConfirmationDrawer />
		</main>
	);
});

function AdminScreen() {
	const navigate = useNavigate();
	const { view } = useParams();

	return (
		<AdminDashboard
			view={isAdminView(view) ? view : 'current-session'}
			getAccessToken={accessToken}
			onNavigate={(next) => void navigate(`/admin/${next}`)}
		/>
	);
}
