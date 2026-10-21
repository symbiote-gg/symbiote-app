import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "use-intl";

import App from "./App";
import { queryClient } from "./api/queries";
import { locale, messages, timeZone } from "./i18n";

import "./index.css";
import "@fontsource-variable/saira/wdth.css";

createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <IntlProvider
                locale={locale}
                messages={messages[locale]}
                timeZone={timeZone}
            >
                <App />
            </IntlProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
