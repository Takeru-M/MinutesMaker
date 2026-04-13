/**
 * フォーマット日時文字列を"月日"形式に変換
 * @example
 * "2026-04-20" -> "4月20日"
 * "2026-04-20T18:00:00" -> "4月20日"
 */
export function formatDateToJapanese(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

/**
 * 会議タイトルと日付を組み合わせて表示形式にする
 * @example
 * "4月20日", "ブロック会議" -> "4月20日のブロック会議"
 */
export function formatMeetingDisplay(dateString: string, meetingTitle: string): string {
  const formattedDate = formatDateToJapanese(dateString);
  return `${formattedDate}の${meetingTitle}`;
}
