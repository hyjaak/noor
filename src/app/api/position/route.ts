import { NextResponse } from "next/server";
import { requireCurrentUser } from "../../../lib/current-user";
import { prisma } from "../../../lib/prisma";
import { apiError } from "../../../lib/api-errors";
export async function GET() { try { const user = await requireCurrentUser(); return NextResponse.json({ status: "real", data: await prisma.quranPosition.findUnique({ where: { userId: user.id } }) }); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { const user = await requireCurrentUser(); const position = await request.json() as { surah: number; ayah: number; page?: number }; const data = await prisma.quranPosition.upsert({ where: { userId: user.id }, update: position, create: { ...position, userId: user.id } }); return NextResponse.json({ status: "real", data }); } catch (error) { return apiError(error); } }
