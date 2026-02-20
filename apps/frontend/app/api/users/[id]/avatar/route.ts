import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "content-length") return;
    headers.set(key, value);
  });

  const res = await fetch(`${BACKEND_URL}/api/users/${id}/avatar`, {
    method: "POST",
    headers,
    body: request.body,
    // @ts-expect-error Node.js fetch supports duplex for streaming
    duplex: "half",
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
