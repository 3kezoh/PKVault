import { Badge, Box, Button, Group, Tooltip } from '@mantine/core';
import { useMergedRef } from '@mantine/hooks';
import { clsx } from 'clsx';
import React from 'react';
import { useTranslate } from '../../../translate/i18n';
import { WithControlsIcons } from '../../interaction/controls/icons/with-controls-icons';
import { getSelectControl } from '../../interaction/focus-controls/common-controls/select-controls';
import { useFocusControls } from '../../interaction/focus-controls/use-focus-controls';
import speciesClasses from '../../sprite-img/species-img/ui-species-img.module.css';
import { useElementVisibility } from '../../visibility/use-element-visibility';
import { useVisibilityContext } from '../../visibility/visibility-context';
import classes from './ui-pokedex-item.module.css';

export type UIPokedexItemRawProps = {
    // lands on the button, as it always has
    ref?: React.Ref<HTMLButtonElement>;
    id: string;
    // context: EntityContext;
    species: number;
    form?: string;
    label: string;
    selected?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
};

export const UIPokedexItemRaw: React.FC<UIPokedexItemRawProps> = (props) => {
    const rootRef = React.useRef<HTMLDivElement>(null);

    // the section gate keeps far away items out of the way, this one narrows it
    // down to the single item: a whole generation is ~150 items, a screen holds ~40
    const sectionVisible = useVisibilityContext() ?? true;
    const itemVisible = useElementVisibility(rootRef);

    // out of sight: render a plain box of the same size instead of the full item.
    // mounting ~1k Buttons with tooltip & focus controls is what makes the pokedex slow.
    if (!sectionVisible || !itemVisible)
        return <UIPokedexItemPlaceholder rootRef={rootRef} {...props} />;

    return <UIPokedexItemContent rootRef={rootRef} {...props} />;
};

type BranchProps = UIPokedexItemRawProps & {
    rootRef: React.RefObject<HTMLDivElement | null>;
};

const UIPokedexItemPlaceholder: React.FC<BranchProps> = ({ rootRef, children }) => {
    return <div ref={rootRef} className={clsx(classes.uiPokedexItem, classes.placeholder)}>
        {React.Children.map(children, (_, i) => <div
            key={i}
            className={clsx(speciesClasses.uiSpeciesImg, speciesClasses.uiSpeciesImgSkeleton)}
        />)}
    </div>;
};

const UIPokedexItemContent: React.FC<BranchProps> = ({
    rootRef, ref: refRoot, id, species, form,
    label, selected, onClick, children
}) => {
    const { t } = useTranslate();

    const { focusProps, controlProps, controlIcons } = useFocusControls({
        scopeNodeId: id,
        controls: [
            onClick && getSelectControl({
                label: t('action.open'),
                action: e => {
                    onClick();
                },
            }),
        ],
    });

    const ref = useMergedRef(
        refRoot,
        focusProps.ref,
        controlProps('open').ref,
    );

    const button = <Button
        {...focusProps}
        {...controlProps('open')}
        ref={ref}
        data-dex-item
        data-selected={selected || undefined}
        variant='default'
        className={classes.button}
        bd='none'
        maw='100%'
    >
        <Group gap='sm' wrap='wrap'>
            {children}
        </Group>

        <Box className={classes.species} p='xs' fz='md'>
            #{species}
        </Box>
        {form && <Box pos='absolute' bottom={0} left={0}>
            <Badge variant='transparent' color="blue" size="sm" radius="sm">{form}</Badge>
        </Box>}
    </Button>;

    return <WithControlsIcons placement='out' icons={controlIcons('open')}
        ref={rootRef}
        className={classes.uiPokedexItem}
    >
        {/* an undiscovered species has nothing to open: the tooltip was disabled anyway,
            and mounting it for ~650 items is not free */}
        {onClick
            ? <Tooltip label={label} withArrow position="bottom">
                {button}
            </Tooltip>
            : button}
    </WithControlsIcons>;
};
