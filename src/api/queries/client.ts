import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data only changes when the ingester stores replays, which invalidates it.
            staleTime: Infinity,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: false,
        },
    },
});
