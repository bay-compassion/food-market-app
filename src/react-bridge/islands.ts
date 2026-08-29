import { AppButton as AppButtonView } from '@/components/AppButton.tsx';
import { EyebrowLabel as EyebrowLabelView } from '@/components/EyebrowLabel.tsx';

import { reactIsland } from './react-island.ts';

/**
 * React components already converted, wrapped once so a Vue parent can render them.
 *
 * Wrapping here rather than in each consumer means one Vue component definition per React
 * component instead of one per call site, and it keeps `reactIsland` out of files whose only
 * involvement is rendering a button. Every entry disappears as its callers become React.
 */
export const AppButton = reactIsland(AppButtonView);
export const EyebrowLabel = reactIsland(EyebrowLabelView);
