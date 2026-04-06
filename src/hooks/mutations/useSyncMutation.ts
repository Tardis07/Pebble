import { useMutation } from "@tanstack/react-query";
import { startSync } from "@/lib/api";
import { useUIStore } from "@/stores/ui.store";

export function useSyncMutation() {
  const pollInterval = useUIStore((s) => s.pollInterval);
  return useMutation({
    mutationFn: (accountId: string) => startSync(accountId, pollInterval),
    // Data refresh is driven by mail:sync-complete and mail:new events in StatusBar
  });
}
