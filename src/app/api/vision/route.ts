import { NextResponse } from "next/server";
import { createVisionEngine } from "../../../../packages/ai-services";
export async function POST(request: Request) { const body = await request.json() as { imageBytes?: number; mimeType?: string }; const result = await createVisionEngine().identify({ imageBytes: body.imageBytes ?? 0, mimeType: body.mimeType ?? "image/jpeg" }); return NextResponse.json({ status: result.status, data: result }); }
