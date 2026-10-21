import classNames from "classnames";
import type { HTMLAttributes, Ref } from "react";

import styles from "./styles.module.css";

export type CardBodyProps = HTMLAttributes<HTMLDivElement> & {
    ref?: Ref<HTMLDivElement>;
};

export function CardBody({ className, ...rest }: CardBodyProps) {
    return <div className={classNames(className, styles.root)} {...rest} />;
}
