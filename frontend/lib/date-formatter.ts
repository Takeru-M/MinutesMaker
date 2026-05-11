const JA_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

const JA_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

/** ja-JP 形式で日時（年月日時分）を返す。null/undefined/不正値は "-" を返す */
export function formatJaDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", JA_DATE_TIME_FORMAT).format(date);
}

/** ja-JP 形式で日付（年月日）を返す。null/undefined/不正値は "-" を返す */
export function formatJaDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", JA_DATE_FORMAT).format(date);
}

/** datetime-local input 用文字列 (YYYY-MM-DDTHH:mm) に変換する。null/undefined/不正値は "" を返す */
export function formatJaDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** バイト数を B/KB/MB 表示に変換する */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

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
