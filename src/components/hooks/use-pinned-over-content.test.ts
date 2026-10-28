import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePinnedOverContent } from './use-pinned-over-content';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe('usePinnedOverContent', () => {
	let report: Callback;
	let bar: HTMLDivElement;

	beforeEach(() => {
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(callback: Callback) {
					report = callback;
				}
				observe() {}
				disconnect() {}
			},
		);
		document.body.innerHTML = '<div id="bar"></div><p id="after"></p>';
		bar = document.getElementById('bar') as HTMLDivElement;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
	});

	function entry(isIntersecting: boolean, top: number): Partial<IntersectionObserverEntry> {
		return {
			isIntersecting,
			boundingClientRect: { top } as DOMRectReadOnly,
			rootBounds: { bottom: 800 } as DOMRectReadOnly,
		};
	}

	it('is pinned while what follows the bar is still below the viewport', () => {
		// Arrange
		const { result } = renderHook(() => usePinnedOverContent({ current: bar }));

		// Act
		act(() => report([entry(false, 1100)]));

		// Assert
		expect(result.current).toBe(true);
	});

	it('rests once what follows the bar is on screen', () => {
		// Arrange
		const { result } = renderHook(() => usePinnedOverContent({ current: bar }));

		act(() => report([entry(false, 1100)]));

		// Act
		act(() => report([entry(true, 700)]));

		// Assert
		expect(result.current).toBe(false);
	});

	it('rests when what follows has scrolled off the top, not the bottom', () => {
		// Arrange
		const { result } = renderHook(() => usePinnedOverContent({ current: bar }));

		// Act
		act(() => report([entry(false, -40)]));

		// Assert
		expect(result.current).toBe(false);
	});
});
