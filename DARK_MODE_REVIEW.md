# ダークモード実装 保守性レビュー

## 🚨 重大な問題

### 1. **Box Shadow色のハードコード** (最優先)

**影響度：高** | **発見数：18+ファイル**

現状：`box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);` などライトモード用の黒色が固定

```css
/* 問題あり */
.hero {
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

/* ダークモードでは薄すぎて見えなくなる */
/* ダークモード時は白っぽいシャドウが必要 */
```

**影響ファイル：**

- home-view.module.css
- meeting-schedule-view.module.css
- agenda-detail-view.module.css
- guide-detail-view.module.css
- notice-detail-view.module.css
- admin-feature-page-shell.module.css
- 他多数

**解決策：**

```css
/* globals.css に追加 */
:root {
  --shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

[data-theme="dark"] {
  --shadow: 0 8px 20px rgba(255, 255, 255, 0.08);
}

/* 使用 */
.hero {
  box-shadow: var(--shadow);
}
```

---

### 2. **未修正ファイルの存在**

**影響度：高** | **数：2ファイル以上**

以下ファイルは修正されていない：

- `repository-detail-view.module.css` - 全色ハードコード
- `content-list-view.module.css` - 全色ハードコード
- `admin-list-search-bar.module.css` - 未確認
- その他フォームコンポーネント

**修正対象ファイルリスト：**

```
features/repository/components/repository-detail-view.module.css
features/content-list/components/content-list-view.module.css
features/agenda/components/agenda-submit-view.module.css
features/agenda/components/minutes-form.module.css
features/meeting-schedule/components/small-meeting-detail-view.module.css
features/admin/components/admin-*.module.css (複数)
```

---

### 3. **グラデーション背景の不完全な対応**

**影響度：中** | **発見数：複数ページ**

```css
/* 現状 */
.page {
  background-image:
    radial-gradient(circle at 20% 10%, var(--accent-soft) 0%, transparent 40%),
    radial-gradient(
      circle at 80% 80%,
      rgba(139, 92, 246, 0.2) 0%,
      transparent 42%
    );
}

/* 問題点 */
/* 1. 2番目のグラデーション色がハードコード */
/* 2. ダークモード時に紫色がライトモード用のカラーである可能性 */
```

**推奨：**

```css
[data-theme="dark"] {
  --glow-secondary: rgba(139, 92, 246, 0.15); /* 暗めに */
}

[data-theme="light"] {
  --glow-secondary: rgba(139, 92, 246, 0.2); /* 明るめ */
}
```

---

### 4. **アシスタントコンポーネントの未対応**

**影響度：中** | **ファイル：2**

```
features/assistant/components/assistant-chat-panel.module.css
features/assistant/components/assistant-chat-toggle.module.css
```

これらは以下のハードコード色を使用：

- `#e0f2fe` (水色背景)
- `#0369a1` (濃い青テキスト)
- `rgba(0, 0, 0, ...)` (黒系シャドウ)

---

## ⚠️ 中程度の問題

### 5. **ハードコードシャドウ (黒色)**

**影響度：中** | **発見数：8ファイル**

```css
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
```

ダークモード時に見えなくなる可能性がある。

**対象ファイル：**

- assistant-chat-toggle.module.css
- assistant-chat-panel.module.css
- agenda-detail-view.module.css
- minutes-list.module.css

---

### 6. **CSS変数の不完全性**

**影響度：中**

グローバルCSSに定義されているCSS変数が不足：

```css
/* 現在ない */
--shadow-sm
--shadow-md
--shadow-lg
--shadow-sm-dark
--shadow-md-dark
--shadow-lg-dark

/* グラデーション関連 */
--glow-accent
--glow-secondary
```

---

### 7. **フォームコンポーネントの未確認**

**影響度：中** | **数：複数**

以下がダークモード対応か未確認：

- input フィールド
- select/dropdown
- textarea
- checkbox/radio
- ボタンコンポーネント

---

## 💡 保守性に関する推奨事項

### 短期（必須）

1. Box shadow CSS変数を全て定義し、修正ファイル + 未修正ファイルで統一
2. 未修正の2大ページ(repository, content-list)を修正
3. アシスタントコンポーネント対応

### 中期（推奨）

1. Tailwind色キューを活用し、ハードコード色を段階的に削除
2. カラーパレット管理用の共通SCSS/CSS設定ファイル作成
3. ダークモード色チェックツール（LighthouseやAccessibility Insights）で検証

### 長期（ベストプラクティス）

1. コンポーネントライブラリで色をプリセット化
2. 自動テスト (E2E) でダークモード表示を検証
3. CSS-in-JSライブラリ (Styled Components等) 導入による自動テーマ管理

---

## 📊 実装状況サマリー

| カテゴリ                | ステータス  | 完了度 | 重要度 |
| ----------------------- | ----------- | ------ | ------ |
| メインページ            | ✅ 修正     | 90%    | 高     |
| コンテンツページ        | ⚠️ 部分修正 | 70%    | 高     |
| Admin画面               | ⚠️ 部分修正 | 60%    | 中     |
| コンポーネント (form等) | ❌ 未修正   | 0%     | 中     |
| アシスタント            | ❌ 未修正   | 0%     | 低     |

---

## 🔧 修正優先度

1. **P0 (今すぐ)** - Box shadow CSS変数化
2. **P1 (本日中)** - repository-detail-view, content-list-view 修正
3. **P2 (今週中)** - アシスタント、フォーム対応
4. **P3 (来週)** - コンポーネント整理、ツール導入
