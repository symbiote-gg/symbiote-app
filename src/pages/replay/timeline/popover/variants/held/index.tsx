import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { TimelineText } from "@/hooks/useTimelineText";
import { Typography } from "@/ui";
import type { Side } from "@/utils/timeline/types";
import { sideClasses } from "../../../side";
import { Footer } from "../../parts/footer";
import { LifeBar } from "../../parts/life-bar";

import styles from "./styles.module.css";

interface HeldProps {
    range: [number, number];
    side: Side;
    text: TimelineText;
}

export function Held({ range: [start, end], side, text }: HeldProps) {
    const t = useTranslations("replay.timeline");

    const seconds = Math.round(end - start);

    return (
        <>
            <div className={classNames(styles.held, sideClasses(side))}>
                <LifeBar
                    seconds={seconds}
                    start={t("heldTook", { time: text.at(start) })}
                    end={t("heldLost", { time: text.at(end) })}
                />
            </div>
            <Footer side={side}>
                <Typography size="xs" variant="tertiary">
                    {t("heldFor", { seconds })}
                </Typography>
            </Footer>
        </>
    );
}
