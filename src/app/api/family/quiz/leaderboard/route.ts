import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireCurrentUser } from "../../../../../lib/current-user";
import { apiError } from "../../../../../lib/api-errors";

// A gentle, shared view of quiz attempts across the family link -- best
// score per person, not a ranked/competitive leaderboard.
export async function GET() {
  try {
    const user = await requireCurrentUser();
    const links = await prisma.familyMember.findMany({ where: { OR: [{ parentId: user.id }, { childId: user.id }] } });
    const memberIds = new Set<string>([user.id]);
    for (const link of links) {
      memberIds.add(link.parentId);
      memberIds.add(link.childId);
    }
    const members = await prisma.user.findMany({ where: { id: { in: [...memberIds] } } });
    const attempts = await prisma.learningEvent.findMany({
      where: { userId: { in: [...memberIds] }, type: "USER_QUIZ_ATTEMPT" },
      orderBy: { createdAt: "desc" },
    });
    const results = members.map((member) => {
      const own = attempts.filter((attempt) => attempt.userId === member.id);
      const best = own.reduce<{ score: number; total: number } | null>((max, attempt) => {
        const payload = attempt.payload as { score?: number; total?: number };
        if (!payload?.total) return max;
        return !max || payload.score! / payload.total > max.score / max.total ? { score: payload.score!, total: payload.total } : max;
      }, null);
      return { userId: member.id, name: member.name ?? member.email, attempts: own.length, best };
    });
    return NextResponse.json({ status: "real", data: results });
  } catch (error) {
    return apiError(error);
  }
}
