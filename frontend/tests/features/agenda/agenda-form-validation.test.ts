import { describe, test, expect } from "vitest";
import { validateRequiredAgendaFields } from "@/features/agenda/validation/agenda-form-validation";
import type { AgendaFormData } from "@/features/agenda/types/agenda-form";

const base: AgendaFormData = {
  date: "2026-05-01",
  meetingType: "block",
  types: ["announcement"],
  title: "テストアジェンダ",
  responsible: "担当者",
  password: "pass123",
  passwordConfirm: "pass123",
  body: "本文内容",
  pdfFile: null,
  votingItems: "",
  relatedPastAgendaIds: [],
  relatedOtherAgendaIds: [],
};

describe("validateRequiredAgendaFields", () => {
  describe("全フィールド正常 - エラーなし", () => {
    test("すべて入力済みの場合はエラーが返らない", () => {
      expect(validateRequiredAgendaFields(base)).toEqual({});
    });

    test("pdfFileのみでbodyなしでもエラーなし", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        body: "",
        pdfFile: new File([""], "test.pdf", { type: "application/pdf" }),
      });
      expect(errors.body).toBeUndefined();
    });
  });

  describe("必須フィールド欠落", () => {
    test("dateが空 -> dateエラー", () => {
      const errors = validateRequiredAgendaFields({ ...base, date: "" });
      expect(errors.date).toBe("agendaForm.errors.dateRequired");
    });

    test("dateが空白のみ -> dateエラー", () => {
      const errors = validateRequiredAgendaFields({ ...base, date: "  " });
      expect(errors.date).toBe("agendaForm.errors.dateRequired");
    });

    test("meetingTypeが空 -> meetingTypeエラー", () => {
      const errors = validateRequiredAgendaFields({ ...base, meetingType: "" });
      expect(errors.meetingType).toBe("agendaForm.errors.meetingTypeRequired");
    });

    test("typesが空配列 -> typesエラー", () => {
      const errors = validateRequiredAgendaFields({ ...base, types: [] });
      expect(errors.types).toBe("agendaForm.errors.typesRequired");
    });

    test("titleが空 -> titleエラー", () => {
      const errors = validateRequiredAgendaFields({ ...base, title: "" });
      expect(errors.title).toBe("agendaForm.errors.titleRequired");
    });

    test("responsibleが空 -> responsibleエラー", () => {
      const errors = validateRequiredAgendaFields({ ...base, responsible: "" });
      expect(errors.responsible).toBe("agendaForm.errors.responsibleRequired");
    });

    test("passwordが空 -> passwordエラー", () => {
      const errors = validateRequiredAgendaFields({ ...base, password: "" });
      expect(errors.password).toBe("agendaForm.errors.passwordRequired");
    });

    test("passwordConfirmが空 -> passwordConfirmエラー", () => {
      const errors = validateRequiredAgendaFields({ ...base, passwordConfirm: "" });
      expect(errors.passwordConfirm).toBe("agendaForm.errors.passwordConfirmRequired");
    });

    test("全フィールド空 -> 全エラーが返る", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        date: "",
        meetingType: "",
        types: [],
        title: "",
        responsible: "",
        password: "",
        passwordConfirm: "",
        body: "",
        pdfFile: null,
      });
      expect(errors.date).toBeDefined();
      expect(errors.meetingType).toBeDefined();
      expect(errors.types).toBeDefined();
      expect(errors.title).toBeDefined();
      expect(errors.responsible).toBeDefined();
      expect(errors.password).toBeDefined();
      expect(errors.passwordConfirm).toBeDefined();
      expect(errors.body).toBeDefined();
    });
  });

  describe("body / pdfFile の排他ルール", () => {
    test("bodyもpdfFileも空 -> bodyエラー", () => {
      const errors = validateRequiredAgendaFields({ ...base, body: "", pdfFile: null });
      expect(errors.body).toBe("agendaForm.errors.bodyOrPdfRequired");
    });

    test("bodyあり + pdfFileなし -> エラーなし", () => {
      const errors = validateRequiredAgendaFields({ ...base, body: "内容", pdfFile: null });
      expect(errors.body).toBeUndefined();
    });

    test("bodyなし + pdfFileあり -> エラーなし", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        body: "",
        pdfFile: new File(["data"], "doc.pdf"),
      });
      expect(errors.body).toBeUndefined();
    });

    test("bodyあり + pdfFileあり -> エラーなし", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        body: "内容",
        pdfFile: new File(["data"], "doc.pdf"),
      });
      expect(errors.body).toBeUndefined();
    });
  });

  describe("votingItems の条件付き必須", () => {
    test("votingタイプ + votingItemsなし -> votingItemsエラー", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        types: ["voting"],
        votingItems: "",
      });
      expect(errors.votingItems).toBe("agendaForm.errors.votingItemsRequired");
    });

    test("voting-plannedタイプ + votingItemsなし -> votingItemsエラー", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        types: ["voting-planned"],
        votingItems: "",
      });
      expect(errors.votingItems).toBe("agendaForm.errors.votingItemsRequired");
    });

    test("votingタイプ + 他のタイプも含む + votingItemsなし -> votingItemsエラー", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        types: ["announcement", "voting"],
        votingItems: "",
      });
      expect(errors.votingItems).toBe("agendaForm.errors.votingItemsRequired");
    });

    test("votingタイプ + votingItemsあり -> エラーなし", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        types: ["voting"],
        votingItems: "案1\n案2",
      });
      expect(errors.votingItems).toBeUndefined();
    });

    test("voting-plannedタイプ + votingItemsあり -> エラーなし", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        types: ["voting-planned"],
        votingItems: "案A",
      });
      expect(errors.votingItems).toBeUndefined();
    });

    test("非votingタイプ + votingItemsなし -> エラーなし", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        types: ["announcement"],
        votingItems: "",
      });
      expect(errors.votingItems).toBeUndefined();
    });

    test("discussionタイプ + votingItemsなし -> エラーなし", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        types: ["discussion"],
        votingItems: "",
      });
      expect(errors.votingItems).toBeUndefined();
    });

    test("typesが空 + votingItemsなし -> votingItemsエラーは出ない（typesエラーのみ）", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        types: [],
        votingItems: "",
      });
      expect(errors.types).toBeDefined();
      expect(errors.votingItems).toBeUndefined();
    });
  });

  describe("エラーは該当フィールドのみ", () => {
    test("dateのみ空の場合はdateエラーのみ", () => {
      const errors = validateRequiredAgendaFields({ ...base, date: "" });
      const keys = Object.keys(errors);
      expect(keys).toEqual(["date"]);
    });

    test("votingタイプ + votingItemsなしの場合はvotingItemsエラーのみ追加", () => {
      const errors = validateRequiredAgendaFields({
        ...base,
        types: ["voting"],
        votingItems: "",
      });
      expect(Object.keys(errors)).toEqual(["votingItems"]);
    });
  });
});
