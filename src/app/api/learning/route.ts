import { NextResponse } from "next/server";
import { createWeakPointEngine } from "../../../../packages/ai-services";
import { deriveLearningProfile } from "../../../../packages/learning";
import { prisma } from "../../../lib/prisma";
import { requireCurrentUser } from "../../../lib/current-user";
import { apiError } from "../../../lib/api-errors";
export async function GET() { try { const user = await requireCurrentUser(); const events = await prisma.learningEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }); const typedEvents = events.map((event) => ({ type: event.type, payload: event.payload as Record<string, unknown>, createdAt: event.createdAt })); const profile = deriveLearningProfile(typedEvents, { 1: 7, 2: 286, 36: 83 }); const weakPoint = (await createWeakPointEngine().detect(typedEvents)).points[0]; await prisma.$transaction(profile.skills.map((skill) => prisma.learningSkill.upsert({ where: { userId_category: { userId: user.id, category: skill.category } }, update: { score: skill.score, status: skill.status }, create: { userId: user.id, category: skill.category, score: skill.score, status: skill.status } }))); return NextResponse.json({ status: "real", data: { skills: profile.skills, quranProgress: profile.quranProgress, weakPoint } }); } catch (error) { return apiError(error); } }
