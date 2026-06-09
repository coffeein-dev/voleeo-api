import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog"
import type { PendingDelete } from "./useTreeActions"

interface Props {
  pendingDelete: PendingDelete | null
  pendingDeleteBatch: string[] | null
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onConfirmBatch: () => void
  onCancelBatch: () => void
}

export function DeleteDialogs({
  pendingDelete,
  pendingDeleteBatch,
  onConfirmDelete,
  onCancelDelete,
  onConfirmBatch,
  onCancelBatch,
}: Props) {
  return (
    <>
      {pendingDelete && (
        <ConfirmationDialog
          title={
            pendingDelete.kind === "request"
              ? "Delete Request"
              : "Delete Folder"
          }
          description={
            <>
              Permanently delete{" "}
              <code className="font-mono text-[0.857rem] bg-subtle text-fg px-1.5 py-0.5 rounded-[3px]">
                {pendingDelete.name}
              </code>
              ?
            </>
          }
          warningText={
            pendingDelete.kind === "folder"
              ? "Every request and sub-folder inside it will also be permanently deleted."
              : undefined
          }
          confirmLabel="Delete"
          confirmVariant="destructive"
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}
      {pendingDeleteBatch && (
        <ConfirmationDialog
          title="Delete Items"
          description={
            <>
              Permanently delete{" "}
              <span className="font-semibold text-fg">
                {pendingDeleteBatch.length} items
              </span>
              ?
            </>
          }
          warningText="Any folders in the selection take their requests and sub-folders with them."
          confirmLabel="Delete"
          confirmVariant="destructive"
          onConfirm={onConfirmBatch}
          onCancel={onCancelBatch}
        />
      )}
    </>
  )
}
