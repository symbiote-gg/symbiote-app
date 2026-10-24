import { Page } from "@/components";
import { useSettings } from "@/hooks/useSettings";
import { ErrorMessage } from "@/ui";
import { StorageCard } from "./storage-card";

export function Settings() {
    const { data: settings, error } = useSettings();

    return (
        <Page>
            {error && <ErrorMessage error={error} />}
            {settings && <StorageCard years={settings.eventRetentionYears} />}
        </Page>
    );
}
