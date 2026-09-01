import { NextResponse } from "next/server";
import { requireCurrentUser } from "../../../lib/current-user";
import { prisma } from "../../../lib/prisma";
import { apiError } from "../../../lib/api-errors";
export async function GET() { try { const user = await requireCurrentUser(); return NextResponse.json({ status: "real", data: await prisma.settings.findUnique({ where: { userId: user.id } }) }); } catch (error) { return apiError(error); } }
export async function PUT(request: Request) { try { const user = await requireCurrentUser(); const body = await request.json() as Record<string, unknown>; const { name, ...settings } = body; if (name !== undefined) await prisma.user.update({ where: { id: user.id }, data: { name: String(name) } }); const data = await prisma.settings.update({ where: { userId: user.id }, data: settings }); return NextResponse.json({ status: "real", data }); } catch (error) { return apiError(error); } }
