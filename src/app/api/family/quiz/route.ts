import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireCurrentUser } from "../../../../lib/current-user";
import { apiError } from "../../../../lib/api-errors";
import { quizCategories, getQuizQuestions, scoreQuiz } from "../../../../../packages/quiz";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  return NextResponse.json({ status: "real", data: { categories: quizCategories, questions: getQuizQuestions(category) } });
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as { category?: string; answers: { questionId: string; optionIndex: number }[] };
    const { score, total } = scoreQuiz(body.answers ?? []);
    const [event] = await prisma.$transaction([
      prisma.learningEvent.create({
        data: { userId: user.id, type: "USER_QUIZ_ATTEMPT", payload: { category: body.category ?? "mixed", score, total } as Prisma.InputJsonValue },
      }),
      prisma.habit.create({ data: { userId: user.id, label: "Family quiz", completedAt: new Date() } }),
    ]);
    return NextResponse.json({ status: "real", data: { event, score, total } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
