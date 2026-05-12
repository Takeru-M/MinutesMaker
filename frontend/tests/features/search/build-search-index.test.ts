import { describe, test, expect } from "vitest";
import { buildSearchIndex } from "@/features/search/utils/build-search-index";
import type { SearchItem } from "@/features/search/types/search-item";

const items: SearchItem[] = [
  { id: "1", date: "2026-05-01", source: "経営会議", title: "Q1 決算報告", summary: "第1四半期の決算内容" },
  { id: "2", date: "2026-05-10", source: "技術部会", title: "システム刷新計画", summary: "新技術スタックの検討", location: "東京" },
  { id: "3", date: "2026-04-20", source: "営業部", title: "新製品ロードマップ", summary: "製品開発の優先度", location: "大阪" },
];

describe("buildSearchIndex", () => {
  test("クエリが空の場合はすべてのアイテムを返す", () => {
    expect(buildSearchIndex(items, "")).toEqual(items);
  });

  test("クエリが空白のみの場合もすべてを返す", () => {
    expect(buildSearchIndex(items, "  ")).toEqual(items);
  });

  test("title でフィルタリングされる", () => {
    const result = buildSearchIndex(items, "決算");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  test("source でフィルタリングされる", () => {
    const result = buildSearchIndex(items, "技術部会");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  test("summary でフィルタリングされる", () => {
    const result = buildSearchIndex(items, "新技術");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  test("location でフィルタリングされる", () => {
    const result = buildSearchIndex(items, "大阪");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  test("date でフィルタリングされる", () => {
    const result = buildSearchIndex(items, "2026-04");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  test("大文字・小文字を区別しない", () => {
    const mixedItems: SearchItem[] = [
      { id: "1", date: "2026-05-01", source: "IT部", title: "System Update", summary: "update summary" },
    ];
    expect(buildSearchIndex(mixedItems, "SYSTEM")).toHaveLength(1);
    expect(buildSearchIndex(mixedItems, "system")).toHaveLength(1);
  });

  test("一致しないクエリは空配列を返す", () => {
    expect(buildSearchIndex(items, "存在しない検索語")).toHaveLength(0);
  });

  test("items が空の場合は空配列を返す", () => {
    expect(buildSearchIndex([], "test")).toHaveLength(0);
  });

  test("前後の空白はトリムされる", () => {
    const result = buildSearchIndex(items, "  決算  ");
    expect(result).toHaveLength(1);
  });

  test("location が undefined でもエラーにならない", () => {
    const noLocation: SearchItem[] = [
      { id: "1", date: "2026-05-01", source: "部署", title: "タイトル", summary: "概要" },
    ];
    expect(() => buildSearchIndex(noLocation, "タイトル")).not.toThrow();
  });
});
