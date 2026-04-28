import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { parseJsonArray } from "@/lib/utils";
import type { InterviewPrepQuestion } from "@/types/analysis";
import { interviewPrepQuestionSchema } from "@/types/analysis";

const storedInterviewPrepQuestionSchema = interviewPrepQuestionSchema.extend({
  answer: z.string().optional()
});

const storedInterviewPrepQuestionsSchema = z.array(storedInterviewPrepQuestionSchema);

export const interviewPrepSessionSelect = {
  id: true,
  analysisId: true,
  sourceFileName: true,
  resumeText: true,
  jobDescription: true,
  questions: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.InterviewPrepSessionSelect;

export type InterviewPrepSessionRecord = Prisma.InterviewPrepSessionGetPayload<{
  select: typeof interviewPrepSessionSelect;
}>;

export function serializeInterviewPrepQuestions(questions: InterviewPrepQuestion[]) {
  return JSON.stringify(
    questions.map((question) => ({
      ...question,
      answer: question.sampleAnswer
    }))
  );
}

export function parseInterviewPrepQuestions(value: string) {
  const parsed = storedInterviewPrepQuestionsSchema.safeParse(parseJsonArray<unknown>(value));

  if (!parsed.success) {
    return [];
  }

  return parsed.data.map((item) => {
    const { answer, ...question } = item;
    void answer;
    return question;
  });
}

export function mapInterviewPrepSession(record: InterviewPrepSessionRecord) {
  return {
    ...record,
    questions: parseInterviewPrepQuestions(record.questions)
  };
}
