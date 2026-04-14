# DB構造改善タスク（長期運用・拡張前提）

## 背景

- 会議は `large` / `small` の2系統
- 大規模会議は議案単位で議事録を持つ
- 小規模会議は会議単位で議事録を持つ
- これをDB制約で担保し、将来拡張時のデータ破損を防ぐ

## 実装タスク

- [x] `meetings` の整合性制約を追加
  - `meeting_scale`, `meeting_type`, `minutes_scope_policy` の組み合わせを強制
  - 期待ルール:
    - `large` -> `minutes_scope_policy='agenda'`, `meeting_type in ('dormitory_general_assembly', 'block', 'annual')`
    - `small` -> `minutes_scope_policy='meeting'`, `meeting_type in ('department', 'committee', 'bureau')`

- [x] `agendas` の `meeting_type` を正規値へ統一
  - legacy 値 `large` を `dormitory_general_assembly` へデータ移行
  - `ck_agendas_meeting_type` を正規値セットに更新

- [x] `agendas` と `meetings` の種別整合をDBで保証
  - `(agendas.meeting_id, agendas.meeting_type)` -> `(meetings.id, meetings.meeting_type)` の複合FKを追加

- [x] 互換性吸収
  - API入力で legacy 値 `large` を受けた場合は正規値へ変換
  - `init_db` の暫定互換カラム追加時のデフォルトを正規値へ更新

## 今後の拡張候補（今回未実施）

- `agendas.meeting_date` の重複正規化（`meetings.scheduled_at` 由来へ整理）
- 会議タイプをマスタテーブル化し、UI表示名・分類を設定駆動化
- 監査ログに「制約違反前の入力」スナップショットを追加
