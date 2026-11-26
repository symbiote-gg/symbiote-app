import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useEffect, useState } from "react";

const COPIED_MS = 1500;

/** Copies text to the clipboard, with `copied` set for a moment after. */
export function useCopyText() {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;

        const timeout = setTimeout(() => setCopied(false), COPIED_MS);

        return () => clearTimeout(timeout);
    }, [copied]);

    const copy = async (text: string) => {
        try {
            await writeText(text);
        } catch {
            return;
        }

        setCopied(true);
    };

    return [copied, copy] as const;
}
