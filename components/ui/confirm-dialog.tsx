"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "삭제",
  cancelLabel = "취소",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="mb-5 text-sm text-text-secondary">{description}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "처리 중..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
