/**
 * Generic confirmation dialog for destructive actions (e.g. deleting a task or session).
 * Rendered into document.body via a React portal so it always appears above all other UI,
 * regardless of stacking contexts in the component tree.
 *
 * Clicking the overlay backdrop calls onCancel, while clicking inside the dialog
 * stops propagation so the backdrop handler does not fire.
 * Body scroll is locked while the dialog is open to prevent background scrolling.
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/ConfirmDialog.css';

/** Props for the ConfirmDialog component. */
interface ConfirmDialogProps {
  /** Whether the dialog is visible. When false the component renders nothing. */
  isOpen: boolean;
  /** Bold heading shown at the top of the dialog. */
  title: string;
  /** Body text describing what will happen on confirmation. */
  message: string;
  /** Called when the user clicks the confirm button. */
  onConfirm: () => void;
  /** Called when the user clicks Cancel or the backdrop. */
  onCancel: () => void;
  /** Label for the confirm button. Defaults to "Potwierdź". */
  confirmText?: string;
  /** Label for the cancel button. Defaults to "Anuluj". */
  cancelText?: string;
}

/**
 * Modal confirmation dialog rendered via a React portal into document.body.
 * Returns null when `isOpen` is false so no DOM nodes are created while hidden.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Potwierdź",
  cancelText = "Anuluj"
}) => {
  // Lock body scroll while the dialog is open to prevent background scrolling on mobile.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="confirm-overlay" onClick={onCancel}>
      {/* stopPropagation prevents the backdrop onClick from firing when clicking inside the dialog. */}
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>{cancelText}</button>
          <button className="confirm-delete" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;