import { useQuery } from "@tanstack/react-query";

import { settingsQuery } from "@/api/queries";
import { Page } from "@/components";
import { ErrorMessage } from "@/ui";
import { ReplaysFolderCard } from "./replays-folder-card";
import { StorageCard } from "./storage-card";

export function Settings() {
    const { data: settings, error } = useQuery(settingsQuery);

    return (
        <Page>
            <ReplaysFolderCard />
            {error && <ErrorMessage error={error} />}
            {settings && <StorageCard years={settings.eventRetentionYears} />}
        </Page>
    );
}
