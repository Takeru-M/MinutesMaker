"use client";

import { useI18n } from "@/features/i18n";
import styles from "./assistant-chat-toggle.module.css";

export interface AssistantChatToggleProps {
  isOpen: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export function AssistantChatToggle({ isOpen, onClick, hasUnread }: AssistantChatToggleProps) {
  const { t } = useI18n();

  return (
    <button
      className={`${styles.toggleButton} ${isOpen ? styles.active : ""}`}
      onClick={onClick}
      aria-label={t("assistant.toggle") || "Toggle AI Assistant"}
      aria-pressed={isOpen}
    >
      {isOpen ? (
        <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      ) : (
        <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.296.772 4.41 2.067 6.092a.75.75 0 01.125.61c-.135.577-.43 1.252-.838 1.942z"
            clipRule="evenodd"
          />
          <circle cx="8" cy="12" r="1.3" fill="white" />
          <circle cx="12" cy="12" r="1.3" fill="white" />
          <circle cx="16" cy="12" r="1.3" fill="white" />
        </svg>
      )}
      {hasUnread && <span className={styles.badge} />}
    </button>
  );
}
