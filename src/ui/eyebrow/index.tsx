import classNames from "classnames";

import { Typography, type TypographyProps } from "../typography";

import styles from "./styles.module.css";

export type EyebrowProps = Omit<
    TypographyProps,
    "size" | "weight" | "variant" | "uppercase"
>;

export function Eyebrow({ className, ...rest }: EyebrowProps) {
    return (
        <Typography
            size="xs"
            weight="semibold"
            variant="tertiary"
            uppercase
            className={classNames(className, styles.root)}
            {...rest}
        />
    );
}
