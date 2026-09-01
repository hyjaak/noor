import data from "./questions.json";

export type QuizCategory = { id: string; label: string; icon: string };
export type QuizQuestion = { id: string; category: string; question: string; options: string[]; answerIndex: number; explanation: string };

export const quizCategories: QuizCategory[] = data.categories;
export const quizQuestions: QuizQuestion[] = data.questions;

export function getQuizQuestions(categoryId?: string): QuizQuestion[] {
  return categoryId ? quizQuestions.filter((question) => question.category === categoryId) : quizQuestions;
}

export function scoreQuiz(answers: { questionId: string; optionIndex: number }[]): { score: number; total: number } {
  const byId = new Map(quizQuestions.map((question) => [question.id, question]));
  const score = answers.reduce((count, answer) => {
    const question = byId.get(answer.questionId);
    return question && question.answerIndex === answer.optionIndex ? count + 1 : count;
  }, 0);
  return { score, total: answers.length };
}
