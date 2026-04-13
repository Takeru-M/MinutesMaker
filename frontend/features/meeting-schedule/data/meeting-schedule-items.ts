import { MeetingScheduleItem } from "@/features/meeting-schedule/types/meeting-schedule-item";

const meetingTemplates = [
  {
    title: "施設改善に関する会議",
    department: "総務",
    location: "第1会議室",
    summary: "共有施設の改善要望と優先順位を確認します。",
  },
  {
    title: "新年度オリエンテーション運営会議",
    department: "情報委員会",
    location: "第2会議室",
    summary: "新入生向け案内と当日の役割分担を整理します。",
  },
  {
    title: "備品購入フロー見直し会議",
    department: "会計",
    location: "第3会議室",
    summary: "申請から承認までの流れを簡素化する案を検討します。",
  },
  {
    title: "防災訓練実施計画会議",
    department: "監察",
    location: "大会議室",
    summary: "訓練の日程、担当、必要備品を確認します。",
  },
  {
    title: "清掃当番調整会議",
    department: "生活",
    location: "第1会議室",
    summary: "各棟の清掃当番と予備日程を調整します。",
  },
  {
    title: "共用スペース利用方針会議",
    department: "総務",
    location: "第2会議室",
    summary: "共用スペースの予約ルールと掲示方法を確認します。",
  },
  {
    title: "掲示板運用見直し会議",
    department: "情報委員会",
    location: "第3会議室",
    summary: "掲示板更新の担当と手順を再整理します。",
  },
  {
    title: "入退寮フロー確認会議",
    department: "会計",
    location: "第1会議室",
    summary: "入退寮時の受付手順と必要書類を確認します。",
  },
  {
    title: "備品棚卸し準備会議",
    department: "監察",
    location: "第2会議室",
    summary: "棚卸しの対象と確認手順を共有します。",
  },
  {
    title: "中間報告取りまとめ会議",
    department: "総務",
    location: "第3会議室",
    summary: "各担当の進捗を集約して報告資料にまとめます。",
  },
  {
    title: "夏季行事企画会議",
    department: "生活",
    location: "大会議室",
    summary: "夏季行事の内容と運営体制を検討します。",
  },
  {
    title: "連絡網更新確認会議",
    department: "情報委員会",
    location: "第1会議室",
    summary: "連絡網の更新状況と差分確認の方法を整理します。",
  },
  {
    title: "共有資料棚整理会議",
    department: "会計",
    location: "第2会議室",
    summary: "不要資料の移動と保管ラベルの運用を確認します。",
  },
  {
    title: "火気管理点検会議",
    department: "監察",
    location: "第3会議室",
    summary: "点検対象と巡回スケジュールを確定します。",
  },
  {
    title: "寮内イベント告知会議",
    department: "総務",
    location: "第1会議室",
    summary: "告知方法と掲載タイミングを調整します。",
  },
  {
    title: "夜間当番引き継ぎ会議",
    department: "生活",
    location: "第2会議室",
    summary: "夜間当番の注意事項と引き継ぎ内容を確認します。",
  },
  {
    title: "議事録共有方法確認会議",
    department: "情報委員会",
    location: "第3会議室",
    summary: "議事録の共有先と公開範囲のルールを整理します。",
  },
  {
    title: "ネットワーク利用案内会議",
    department: "会計",
    location: "第1会議室",
    summary: "新規利用者向けの案内文と問い合わせ先を確認します。",
  },
  {
    title: "備品貸出ルール確認会議",
    department: "監察",
    location: "第2会議室",
    summary: "貸出時の確認事項と返却期限を見直します。",
  },
  {
    title: "寮生アンケート集計会議",
    department: "総務",
    location: "大会議室",
    summary: "アンケート結果をもとに改善提案を整理します。",
  },
  {
    title: "防災備蓄点検会議",
    department: "生活",
    location: "第1会議室",
    summary: "備蓄品の数量と保管状況を確認します。",
  },
  {
    title: "掲示物更新会議",
    department: "情報委員会",
    location: "第2会議室",
    summary: "古い掲示物の差し替えと配置場所を調整します。",
  },
  {
    title: "期末会計確認会議",
    department: "会計",
    location: "第3会議室",
    summary: "支出実績と残高見込みを確認します。",
  },
  {
    title: "防犯巡回計画会議",
    department: "監察",
    location: "第1会議室",
    summary: "巡回ルートと時間帯を再調整します。",
  },
  {
    title: "共用設備メンテナンス会議",
    department: "総務",
    location: "第2会議室",
    summary: "点検対象の設備と業者連絡の担当を決めます。",
  },
  {
    title: "寮内案内表示見直し会議",
    department: "生活",
    location: "第3会議室",
    summary: "案内表示の配置と表記ゆれを確認します。",
  },
  {
    title: "メール配信運用会議",
    department: "情報委員会",
    location: "第1会議室",
    summary: "定期配信の担当とテンプレートを整備します。",
  },
  {
    title: "予算案初稿確認会議",
    department: "会計",
    location: "第2会議室",
    summary: "翌期予算案の初稿を確認し、修正点を整理します。",
  },
  {
    title: "備品保管場所整理会議",
    department: "監察",
    location: "第3会議室",
    summary: "保管場所の表示と棚割りを見直します。",
  },
  {
    title: "行事準備分担会議",
    department: "総務",
    location: "大会議室",
    summary: "各担当の準備項目と期限を確認します。",
  },
  {
    title: "清掃報告確認会議",
    department: "生活",
    location: "第1会議室",
    summary: "清掃完了報告の提出状況を確認します。",
  },
  {
    title: "掲示期限管理会議",
    department: "情報委員会",
    location: "第2会議室",
    summary: "掲示物の期限管理と撤去タイミングを見直します。",
  },
  {
    title: "備品発注確認会議",
    department: "会計",
    location: "第3会議室",
    summary: "発注予定の備品と納期を最終確認します。",
  },
  {
    title: "巡回記録共有会議",
    department: "監察",
    location: "第1会議室",
    summary: "巡回記録の共有方法と保存先を統一します。",
  },
  {
    title: "寮内改善提案会議",
    department: "総務",
    location: "第2会議室",
    summary: "改善提案の優先度と実施時期を確認します。",
  },
  {
    title: "生活ルール周知会議",
    department: "生活",
    location: "第3会議室",
    summary: "新しいルールの周知方法を整理します。",
  },
  {
    title: "広報原稿確認会議",
    department: "情報委員会",
    location: "大会議室",
    summary: "広報原稿の内容確認と公開日時を決めます。",
  },
  {
    title: "収支見込み確認会議",
    department: "会計",
    location: "第1会議室",
    summary: "月次収支の見込みと補正案を確認します。",
  },
  {
    title: "安全確認手順会議",
    department: "監察",
    location: "第2会議室",
    summary: "日常点検での安全確認手順を再確認します。",
  },
  {
    title: "年度末まとめ会議",
    department: "総務",
    location: "第3会議室",
    summary: "年度末のまとめ資料を作成するための確認会議です。",
  },
  {
    title: "設備利用案内会議",
    department: "生活",
    location: "第1会議室",
    summary: "設備の利用案内と注意点をまとめます。",
  },
  {
    title: "運用改善振り返り会議",
    department: "情報委員会",
    location: "第2会議室",
    summary: "直近の運用改善施策の成果を振り返ります。",
  },
  {
    title: "来月予算案調整会議",
    department: "会計",
    location: "第3会議室",
    summary: "来月分の予算配分と調整点を確認します。",
  },
  {
    title: "巡回報告共有会議",
    department: "監察",
    location: "大会議室",
    summary: "巡回報告の共有と次回対応を決めます。",
  },
] satisfies MeetingScheduleItem[];

const baseScheduledAt = new Date("2026-04-10T09:00:00+09:00");

export const meetingScheduleItems = meetingTemplates.map((template, index) => {
  const scheduledAt = new Date(baseScheduledAt);

  scheduledAt.setDate(baseScheduledAt.getDate() - index);

  return {
    id: index + 1,
    title: template.title,
    scheduledAt: scheduledAt.toISOString(),
    department: template.department,
    location: template.location,
  } satisfies MeetingScheduleItem;
});