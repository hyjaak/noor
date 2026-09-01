import { NextResponse } from "next/server";
import { requireCurrentUser } from "../../../lib/current-user";
import { apiError } from "../../../lib/api-errors";
export async function GET() { try { const user = await requireCurrentUser(); return NextResponse.json({ status: "real", data: await prismaBookmarkList(user.id) }); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { const user = await requireCurrentUser(); const bookmark = await request.json() as { surah: number; ayah: number; note?: string }; const data = await prismaBookmarkCreate(user.id, bookmark); return NextResponse.json({ status: "real", data }, { status: 201 }); } catch (error) { return apiError(error); } }
async function prismaBookmarkList(userId: string) { const { prisma } = await import("../../../lib/prisma"); return prisma.bookmark.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }); }
async function prismaBookmarkCreate(userId: string, bookmark: { surah: number; ayah: number; note?: string }) { const { prisma } = await import("../../../lib/prisma"); return prisma.bookmark.upsert({ where: { userId_surah_ayah: { userId, surah: bookmark.surah, ayah: bookmark.ayah } }, update: { note: bookmark.note }, create: { userId, surah: bookmark.surah, ayah: bookmark.ayah, note: bookmark.note } }); }
