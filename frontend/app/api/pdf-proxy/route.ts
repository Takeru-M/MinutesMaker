import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOST_SUFFIXES = [".amazonaws.com"];

function isSupportedPdfContentType(contentType: string): boolean {
  if (!contentType) {
    return true;
  }

  const normalized = contentType.toLowerCase();
  return (
    normalized.includes("application/pdf") ||
    normalized.includes("application/octet-stream") ||
    normalized.includes("binary/octet-stream") ||
    normalized.includes("application/x-pdf")
  );
}

function isAllowedUrl(target: URL): boolean {
  if (target.protocol !== "https:") {
    return false;
  }

  return ALLOWED_HOST_SUFFIXES.some((suffix) => target.hostname.endsWith(suffix));
}

async function safeReadUpstreamErrorBody(upstream: Response): Promise<string | null> {
  try {
    const text = await upstream.text();
    if (!text) {
      return null;
    }
    return text.slice(0, 400);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");
  if (!source) {
    return NextResponse.json({ detail: "url is required" }, { status: 400 });
  }

  // NOTE:
  // `url` は署名付きURLそのものをクエリで受け取る。
  // ここで URL を再シリアライズすると、署名に使われたエンコード表現が変わる可能性があるため、
  // 上流への fetch には `source` (元文字列) をそのまま使う。
  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return NextResponse.json({ detail: "invalid url" }, { status: 400 });
  }

  if (!isAllowedUrl(parsed)) {
    return NextResponse.json({ detail: "url is not allowed" }, { status: 403 });
  }

  let upstream: Response;
  try {
    const range = request.headers.get("range");
    const ifRange = request.headers.get("if-range");

    upstream = await fetch(source, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "application/pdf,*/*",
        ...(range ? { Range: range } : {}),
        ...(ifRange ? { "If-Range": ifRange } : {}),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail: "failed to fetch source pdf",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const upstreamContentType = upstream.headers.get("content-type") || "unknown";
    const upstreamLocation = upstream.headers.get("location") || null;
    const upstreamRequestId =
      upstream.headers.get("x-amz-request-id") || upstream.headers.get("x-amz-id-2") || null;
    const upstreamErrorBody = await safeReadUpstreamErrorBody(upstream);

    return NextResponse.json(
      {
        detail: `source pdf is unavailable (status: ${upstream.status || 0})`,
        upstream_status: upstream.status || 0,
        upstream_content_type: upstreamContentType,
        upstream_location: upstreamLocation,
        upstream_request_id: upstreamRequestId,
        upstream_error_body: upstreamErrorBody,
      },
      { status: 502 },
    );
  }

  const upstreamContentType = upstream.headers.get("content-type") || "";
  if (!isSupportedPdfContentType(upstreamContentType)) {
    return NextResponse.json(
      { detail: `source is not a pdf (content-type: ${upstreamContentType || "unknown"})` },
      { status: 502 },
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", upstreamContentType || "application/pdf");
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) {
    headers.set("Accept-Ranges", acceptRanges);
  }
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) {
    headers.set("Content-Range", contentRange);
  }
  const etag = upstream.headers.get("etag");
  if (etag) {
    headers.set("ETag", etag);
  }
  const lastModified = upstream.headers.get("last-modified");
  if (lastModified) {
    headers.set("Last-Modified", lastModified);
  }
  headers.set("Cache-Control", "private, max-age=60");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}