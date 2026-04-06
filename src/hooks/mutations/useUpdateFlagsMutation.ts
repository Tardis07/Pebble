import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMessageFlags } from "@/lib/api";
import type { Message } from "@/lib/api";

interface UpdateFlagsParams {
  messageId: string;
  isRead?: boolean;
  isStarred?: boolean;
}

export function useUpdateFlagsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateFlagsParams) =>
      updateMessageFlags(params.messageId, params.isRead, params.isStarred),
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["messages"] });
      await queryClient.cancelQueries({
        queryKey: ["message", params.messageId],
      });

      // Snapshot previous message
      const previousMessage = queryClient.getQueryData<Message | null>([
        "message",
        params.messageId,
      ]);

      // Optimistically update the single message cache
      if (previousMessage) {
        queryClient.setQueryData<Message | null>(
          ["message", params.messageId],
          {
            ...previousMessage,
            ...(params.isRead !== undefined && { is_read: params.isRead }),
            ...(params.isStarred !== undefined && {
              is_starred: params.isStarred,
            }),
          },
        );
      }

      return { previousMessage };
    },
    onError: (_err, params, context) => {
      // Rollback on error
      if (context?.previousMessage) {
        queryClient.setQueryData(
          ["message", params.messageId],
          context.previousMessage,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}
