import classNames from "classnames";
import type { ElementType, HTMLAttributes, ReactNode, Ref } from "react";

import styles from "./styles.module.css";

export type TypographySize = "xs" | "sm" | "base" | "lg" | "xl2";

interface BaseTypographyProps {
    as?: ElementType;
    size?: TypographySize;
    weight?: "regular" | "semibold";
    variant?: "primary" | "secondary" | "tertiary";
    uppercase?: boolean;
    noWrap?: boolean;
    truncate?: boolean;
    mono?: boolean;
    display?: boolean;
    className?: string;
    ref?: Ref<HTMLElement>;
    children: ReactNode;
}

export type TypographyProps = Omit<
    HTMLAttributes<HTMLElement>,
    keyof BaseTypographyProps
> &
    BaseTypographyProps;

const COMPONENT_MAP: Record<TypographySize, ElementType> = {
    xs: "p",
    sm: "p",
    base: "p",
    lg: "p",
    xl2: "h1",
};

export function Typography({
    as,
    size = "base",
    weight = "regular",
    variant = "primary",
    uppercase,
    noWrap,
    truncate,
    mono,
    display,
    className,
    children,
    ...rest
}: TypographyProps) {
    const Root = as ?? COMPONENT_MAP[size];

    return (
        <Root
            className={classNames(
                className,
                styles.root,
                styles[size],
                styles[weight],
                styles[variant],
                {
                    [styles.uppercase]: uppercase,
                    [styles.noWrap]: noWrap,
                    [styles.truncate]: truncate,
                    [styles.mono]: mono,
                    [styles.display]: display,
                },
            )}
            {...rest}
        >
            {children}
        </Root>
    );
}
