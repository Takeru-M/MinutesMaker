import { describe, test, expect } from "vitest";
import {
  formatJaDateTime,
  formatJaDate,
  formatJaDateTimeLocal,
  formatFileSize,
  formatDateToJapanese,
  formatMeetingDisplay,
} from "@/lib/date-formatter";

describe("formatJaDateTime", () => {
  test("ISO 文字列を ja-JP 日時形式に変換する", () => {
    const result = formatJaDateTime("2026-05-01T10:30:00");
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/05/);
    expect(result).toMatch(/01/);
    expect(result).toMatch(/10/);
    expect(result).toMatch(/30/);
  });

  test("null を渡すと '-' を返す", () => {
    expect(formatJaDateTime(null)).toBe("-");
  });

  test("undefined を渡すと '-' を返す", () => {
    expect(formatJaDateTime(undefined)).toBe("-");
  });

  test("空文字を渡すと '-' を返す", () => {
    expect(formatJaDateTime("")).toBe("-");
  });

  test("不正な日付文字列はそのまま返す", () => {
    expect(formatJaDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatJaDate", () => {
  test("ISO 文字列を ja-JP 日付形式に変換する", () => {
    const result = formatJaDate("2026-12-25");
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/12/);
    expect(result).toMatch(/25/);
  });

  test("null を渡すと '-' を返す", () => {
    expect(formatJaDate(null)).toBe("-");
  });

  test("undefined を渡すと '-' を返す", () => {
    expect(formatJaDate(undefined)).toBe("-");
  });
});

describe("formatJaDateTimeLocal", () => {
  test("ISO 文字列を YYYY-MM-DDTHH:mm 形式に変換する", () => {
    const result = formatJaDateTimeLocal("2026-03-15T09:05:00");
    expect(result).toMatch(/^2026-03-15T09:05$/);
  });

  test("null を渡すと空文字を返す", () => {
    expect(formatJaDateTimeLocal(null)).toBe("");
  });

  test("undefined を渡すと空文字を返す", () => {
    expect(formatJaDateTimeLocal(undefined)).toBe("");
  });

  test("不正な日付は空文字を返す", () => {
    expect(formatJaDateTimeLocal("invalid")).toBe("");
  });

  test("月・日・時・分が 2 桁ゼロ埋めされる", () => {
    const result = formatJaDateTimeLocal("2026-01-05T08:03:00");
    expect(result).toBe("2026-01-05T08:03");
  });
});

describe("formatFileSize", () => {
  test("1023 bytes -> B 表示", () => {
    expect(formatFileSize(1023)).toBe("1023B");
  });

  test("1024 bytes -> KB 表示", () => {
    expect(formatFileSize(1024)).toBe("1.00KB");
  });

  test("1MB -> MB 表示", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.00MB");
  });

  test("0 bytes -> 0B", () => {
    expect(formatFileSize(0)).toBe("0B");
  });

  test("2.5 KB -> 小数2桁", () => {
    expect(formatFileSize(2560)).toBe("2.50KB");
  });
});

describe("formatDateToJapanese", () => {
  test("日付文字列を '月日' 形式に変換する", () => {
    expect(formatDateToJapanese("2026-04-20")).toBe("4月20日");
  });

  test("月が1桁の場合はゼロなし", () => {
    expect(formatDateToJapanese("2026-01-05")).toBe("1月5日");
  });
});

describe("formatMeetingDisplay", () => {
  test("日付とミーティングタイトルを組み合わせる", () => {
    expect(formatMeetingDisplay("2026-04-20", "ブロック会議")).toBe("4月20日のブロック会議");
  });
});
