import { fetchStandbyCode } from '../../services/qr-posters';
import { useRootStore } from '../../stores/react/store-context';
import { StandbyPosterStore } from '../../stores/standby-poster.store';
import { AdminPosterGate } from './AdminPosterGate';
import { StandbyPosterPage } from './StandbyPoster';

/** The `standbyPosterPath` route: admins only, in its own lazily loaded module. */
export function StandbyPosterRoute() {
	const root = useRootStore();

	return (
		<AdminPosterGate>
			<StandbyPosterPage
				createStore={() =>
					new StandbyPosterStore(async () => fetchStandbyCode(await root.requestHeaders()))
				}
			/>
		</AdminPosterGate>
	);
}
