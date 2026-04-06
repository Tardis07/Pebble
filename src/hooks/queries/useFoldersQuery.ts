import { useQuery } from "@tanstack/react-query";
import { listFolders } from "@/lib/api";

export const foldersQueryKey = (accountId: string) =>
  ["folders", accountId] as const;

export function useFoldersQuery(accountId: string | null) {
  return useQuery({
    queryKey: foldersQueryKey(accountId ?? ""),
    queryFn: () => listFolders(accountId!),
    enabled: !!accountId,
    select: (folders) => [...folders].sort((a, b) => a.sort_order - b.sort_order),
  });
}
