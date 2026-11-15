import styles from "./styles.module.css";

export function Sheen({ id }: { id: string }) {
    return (
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={styles.top} />
            <stop offset="0.45" className={styles.middle} />
            <stop offset="1" className={styles.base} />
        </linearGradient>
    );
}
