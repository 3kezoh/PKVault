import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { VISIBILITY_MARGIN } from '../visibility-margin';

class FakeIntersectionObserver {
    static instances: FakeIntersectionObserver[] = [];

    readonly targets = new Set<Element>();
    readonly margin: string;

    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.callback = callback;
        this.margin = options?.rootMargin ?? '';
        FakeIntersectionObserver.instances.push(this);
    }

    observe(el: Element) {
        this.targets.add(el);
    }

    unobserve(el: Element) {
        this.targets.delete(el);
    }

    disconnect() {
        this.targets.clear();
    }

    /** what the browser would report, on demand */
    fire(el: Element, isIntersecting: boolean) {
        act(() => {
            this.callback([ { target: el, isIntersecting } as IntersectionObserverEntry ], this as never);
        });
    }
}

// the observers are cached in module scope, so each test needs a fresh module
const importHook = async () => (await import('../use-element-visibility')).useElementVisibility;

describe('use-element-visibility', () => {
    beforeEach(() => {
        vi.resetModules();
        FakeIntersectionObserver.instances = [];
        vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const makeRef = (el: Element) => ({ current: el }) as React.RefObject<Element>;

    const getObserver = () => {
        const observer = FakeIntersectionObserver.instances[ 0 ];
        if (!observer)
            throw new Error('no observer was created');

        return observer;
    };

    test('should return the initial value until the observer reports', async () => {
        const useElementVisibility = await importHook();

        const { result } = renderHook(() => useElementVisibility(makeRef(document.createElement('div'))));

        expect(result.current).toBe(false);
    });

    test('should honor a truthy initial value', async () => {
        const useElementVisibility = await importHook();

        const { result } = renderHook(() => useElementVisibility(makeRef(document.createElement('div')), true));

        expect(result.current).toBe(true);
    });

    test('should become visible once the element intersects, and back', async () => {
        const useElementVisibility = await importHook();

        const el = document.createElement('div');
        const { result } = renderHook(() => useElementVisibility(makeRef(el)));

        const observer = getObserver();

        observer.fire(el, true);
        expect(result.current).toBe(true);

        observer.fire(el, false);
        expect(result.current).toBe(false);
    });

    test('should share a single observer between every element', async () => {
        const useElementVisibility = await importHook();

        for (let i = 0; i < 5; i++)
            renderHook(() => useElementVisibility(makeRef(document.createElement('div'))));

        expect(FakeIntersectionObserver.instances).toHaveLength(1);
        expect(getObserver().targets.size).toBe(5);
    });

    test('should observe with the shared margin', async () => {
        const useElementVisibility = await importHook();

        renderHook(() => useElementVisibility(makeRef(document.createElement('div'))));

        expect(getObserver().margin).toBe(VISIBILITY_MARGIN);
    });

    test('should stop observing on unmount', async () => {
        const useElementVisibility = await importHook();

        const el = document.createElement('div');
        const { unmount } = renderHook(() => useElementVisibility(makeRef(el)));

        const observer = getObserver();
        expect(observer.targets.has(el)).toBe(true);

        unmount();
        expect(observer.targets.has(el)).toBe(false);
    });

    test('should observe the new element when visibility swaps it', async () => {
        const useElementVisibility = await importHook();

        // mimics the pokedex item: a placeholder out of sight, the real content in sight
        const placeholder = document.createElement('div');
        const content = document.createElement('div');
        const ref = makeRef(placeholder);

        const { result } = renderHook(() => {
            const visible = useElementVisibility(ref);
            // React attaches refs after render, before effects
            ref.current = visible ? content : placeholder;
            return visible;
        });

        const observer = getObserver();
        expect(observer.targets.has(placeholder)).toBe(true);

        observer.fire(placeholder, true);

        expect(result.current).toBe(true);
        expect(observer.targets.has(content)).toBe(true);
        expect(observer.targets.has(placeholder)).toBe(false);

        // and the swapped-in element drives the state from now on
        observer.fire(content, false);

        expect(result.current).toBe(false);
        expect(observer.targets.has(placeholder)).toBe(true);
        expect(observer.targets.has(content)).toBe(false);
    });
});
