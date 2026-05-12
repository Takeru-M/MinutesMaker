"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AssistantChatPanel } from "./assistant-chat-panel";
import { AssistantChatToggle } from "./assistant-chat-toggle";
import styles from "./assistant-floating-widget.module.css";

const MEETING_ID_RE = /\/meeting-schedule\/(\d+)/;

function extractMeetingId(pathname: string): number | null {
  const match = pathname.match(MEETING_ID_RE);
  return match ? parseInt(match[1], 10) : null;
}

export function AssistantFloatingWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const meetingId = extractMeetingId(pathname);

  return (
    <div className={styles.container}>
      <AssistantChatToggle isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />
      <AssistantChatPanel meetingId={meetingId} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
