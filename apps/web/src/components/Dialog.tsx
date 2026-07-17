/* Carbon owns focus management, dismissal, and modal semantics. ShareStack only
   supplies the domain-specific consequence copy and decision labels. */
import { ComposedModal, ModalBody, ModalFooter, ModalHeader } from "@carbon/react";

interface Props {
  title: string;
  children: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  onClose: () => void;
  primaryDisabled?: boolean;
  primaryTone?: "action" | "danger";
  cancelLabel?: string;
}

export default function Dialog({
  title, children, primaryLabel, onPrimary, onClose,
  primaryDisabled = false, primaryTone = "action", cancelLabel = "Cancel",
}: Props) {
  return (
    <ComposedModal
      open
      size="sm"
      aria-label={title}
      danger={primaryTone === "danger"}
      onClose={() => onClose()}
      selectorPrimaryFocus="input, textarea, select, .cds--modal-footer button.cds--btn--primary, .cds--modal-footer button.cds--btn--danger"
    >
      <ModalHeader title={title} closeModal={onClose} />
      <ModalBody className="decision-modal__body">{children}</ModalBody>
      <ModalFooter
        primaryButtonText={primaryLabel}
        primaryButtonDisabled={primaryDisabled}
        secondaryButtonText={cancelLabel}
        onRequestClose={onClose}
        onRequestSubmit={onPrimary}
        danger={primaryTone === "danger"}
      >
        {null}
      </ModalFooter>
    </ComposedModal>
  );
}
