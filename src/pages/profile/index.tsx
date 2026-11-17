import { Page } from "@/components";
import { ProfileHeader } from "./header";
import { ScoreCard } from "./score-card";

export function Profile() {
    return (
        <Page>
            <ProfileHeader />
            <ScoreCard />
        </Page>
    );
}
