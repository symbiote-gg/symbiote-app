import { useTranslations } from "use-intl";

import type { GameTextNode } from "@/utils/game-text";

import styles from "./styles.module.css";

const NUMBER = /^[-+]?[\d.,]+%?$/;

export interface GameTextProps {
    nodes: GameTextNode[];
}

export function GameText({ nodes }: GameTextProps) {
    const t = useTranslations("gameText");

    const scaling = (percent: number) => t("scaling", { percent });

    return <Nodes nodes={nodes} scaling={scaling} />;
}

interface NodesProps {
    nodes: GameTextNode[];
    scaling: (percent: number) => string;
}

function Nodes({ nodes, scaling }: NodesProps) {
    return nodes.map((node, index) => {
        if (typeof node === "string") return node;
        if (node.type === "break") return <br key={index} />;
        if (node.type === "scaling") {
            return (
                <span key={index} className={styles.muted}>
                    {scaling(node.percent)}
                </span>
            );
        }

        const [only] = node.children;
        const number =
            node.tone === "highlight" &&
            node.children.length === 1 &&
            typeof only === "string" &&
            NUMBER.test(only);

        return (
            <span
                key={index}
                className={number ? styles.number : styles[node.tone]}
            >
                <Nodes nodes={node.children} scaling={scaling} />
            </span>
        );
    });
}
