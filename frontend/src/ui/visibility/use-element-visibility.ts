import React from 'react';
import { VISIBILITY_MARGIN } from './visibility-margin';

type Entry = {
    observer: IntersectionObserver;
    callbacks: Map<Element, (visible: boolean) => void>;
};

const createEntry = (): Entry => {
    const callbacks = new Map<Element, (visible: boolean) => void>();

    const observer = new IntersectionObserver(
        (list) => {
            for (const entry of list)
                callbacks.get(entry.target)?.(entry.isIntersecting);
        },
        {
            threshold: 0, // trigger from 0% visible
            rootMargin: VISIBILITY_MARGIN, // trigger from some distance
            scrollMargin: VISIBILITY_MARGIN,   // same but in scroll context
        },
    );

    return { observer, callbacks };
};

let entry: Entry | undefined;

// a single observer shared by every element: the pokedex observes ~650 of them.
// created on first use only, IntersectionObserver does not exist outside a browser
const getEntry = () => entry ??= createEntry();

/**
 * Per-element visibility, to mount only what is near the viewport.
 * Same idea as VisibilityObserver, but one element at a time instead of a whole section.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useElementVisibility = (ref: React.RefObject<any>, initialValue = false) => {
    const [ visible, setVisible ] = React.useState(initialValue);

    React.useEffect(() => {
        const el = ref.current;
        if (!el)
            return;

        const { observer, callbacks } = getEntry();

        callbacks.set(el, setVisible);
        observer.observe(el);

        return () => {
            callbacks.delete(el);
            observer.unobserve(el);
        };
        // `visible` swaps the element being rendered (placeholder <-> content),
        // so it is also what tells us to observe the new one
    }, [ ref, visible ]);

    return visible;
};
