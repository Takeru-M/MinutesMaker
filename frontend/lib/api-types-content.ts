
export type ContentAttachmentResponse = {
  id: number;
  file_name: string;
  s3_key: string;
  file_size: number;
  mime_type: string;
  order_no: number;
  created_at: string;
};

export type ContentDetailResponse = {
  id: number;
  content_type: "repository" | "guide";
  title: string;
  content: string;
  status: string;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  attachments: ContentAttachmentResponse[];
};
