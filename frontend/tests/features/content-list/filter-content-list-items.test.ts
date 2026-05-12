import { describe, test, expect } from "vitest";
import { filterContentListItems } from "@/features/content-list/utils/filter-content-list-items";
import type { ContentListItem } from "@/features/content-list/types/content-list-item";

const items: ContentListItem[] = [
  { id: "1", date: "2026-05-01", source: "経営会議", title: "Q1 決算報告" },
  { id: "2", date: "2026-05-10", source: "技術部会", title: "システム刷新計画" },
  { id: "3", date: "2026-04-20", source: "営業部", title: "新製品ロードマップ" },
];

const emptyFilters = { date: "", source: "", title: "" };

describe("filterContentListItems", () => {
  test("フィルターがすべて空の場合はすべてのアイテムを返す", () => {
    expect(filterContentListItems(items, emptyFilters)).toEqual(items);
  });

  describe("date フィルター", () => {
    test("完全一致でフィルタリングされる", () => {
      const result = filterContentListItems(items, { ...emptyFilters, date: "2026-05-01" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    test("一致しない date は空を返す", () => {
      const result = filterContentListItems(items, { ...emptyFilters, date: "2000-01-01" });
      expect(result).toHaveLength(0);
    });

    test("date が空なら全件返す", () => {
      expect(filterContentListItems(items, { ...emptyFilters, date: "" })).toHaveLength(3);
    });
  });

  describe("source フィルター", () => {
    test("部分一致でフィルタリングされる", () => {
      const result = filterContentListItems(items, { ...emptyFilters, source: "技術" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    test("大文字・小文字を区別しない", () => {
      const mixedItems: ContentListItem[] = [
        { id: "1", date: "2026-01-01", source: "IT部", title: "テスト" },
      ];
      expect(filterContentListItems(mixedItems, { ...emptyFilters, source: "it" })).toHaveLength(1);
      expect(filterContentListItems(mixedItems, { ...emptyFilters, source: "IT" })).toHaveLength(1);
    });

    test("前後の空白はトリムされる", () => {
      const result = filterContentListItems(items, { ...emptyFilters, source: "  営業部  " });
      expect(result).toHaveLength(1);
    });

    test("一致しない source は空を返す", () => {
      expect(filterContentListItems(items, { ...emptyFilters, source: "存在しない部署" })).toHaveLength(0);
    });
  });

  describe("title フィルター", () => {
    test("部分一致でフィルタリングされる", () => {
      const result = filterContentListItems(items, { ...emptyFilters, title: "決算" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    test("一致しない title は空を返す", () => {
      expect(filterContentListItems(items, { ...emptyFilters, title: "存在しない" })).toHaveLength(0);
    });
  });

  describe("複合フィルター", () => {
    test("date と source を同時に指定できる", () => {
      const result = filterContentListItems(items, {
        date: "2026-05-10",
        source: "技術",
        title: "",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    test("date が合っても source が不一致なら空", () => {
      const result = filterContentListItems(items, {
        date: "2026-05-01",
        source: "技術部会",
        title: "",
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("エッジケース", () => {
    test("items が空の場合は空配列を返す", () => {
      expect(filterContentListItems([], emptyFilters)).toHaveLength(0);
    });

    test("複数アイテムが同じ date の場合はすべてマッチ", () => {
      const sameDate: ContentListItem[] = [
        { id: "1", date: "2026-06-01", source: "A", title: "TA" },
        { id: "2", date: "2026-06-01", source: "B", title: "TB" },
      ];
      expect(filterContentListItems(sameDate, { ...emptyFilters, date: "2026-06-01" })).toHaveLength(2);
    });
  });
});
