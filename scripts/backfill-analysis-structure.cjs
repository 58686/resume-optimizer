const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function main() {
  const rows = await prisma.resumeAnalysis.findMany({
    include: {
      keywords: true,
      suggestionItems: true,
      projectItems: true,
      interviewItems: true
    }
  });

  let updatedCount = 0;

  for (const row of rows) {
    const matchedKeywords = parseJsonArray(row.matchedKeywords);
    const missingKeywords = parseJsonArray(row.missingKeywords);
    const suggestions = parseJsonArray(row.suggestions);
    const rewrittenProjects = parseJsonArray(row.rewrittenProjects);
    const interviewQuestions = parseJsonArray(row.interviewQuestions);

    const hasStructuredData =
      row.keywords.length > 0 ||
      row.suggestionItems.length > 0 ||
      row.projectItems.length > 0 ||
      row.interviewItems.length > 0;

    const hasLegacyData =
      matchedKeywords.length > 0 ||
      missingKeywords.length > 0 ||
      suggestions.length > 0 ||
      rewrittenProjects.length > 0 ||
      interviewQuestions.length > 0;

    if (hasStructuredData || !hasLegacyData) {
      continue;
    }

    await prisma.$transaction([
      prisma.analysisKeyword.createMany({
        data: [
          ...matchedKeywords.map((value, position) => ({
            analysisId: row.id,
            kind: "matched",
            value,
            position
          })),
          ...missingKeywords.map((value, position) => ({
            analysisId: row.id,
            kind: "missing",
            value,
            position
          }))
        ]
      }),
      prisma.analysisSuggestion.createMany({
        data: suggestions.map((text, position) => ({
          analysisId: row.id,
          text,
          position
        }))
      }),
      prisma.analysisProject.createMany({
        data: rewrittenProjects.map((project, position) => ({
          analysisId: row.id,
          title: project.title || "",
          before: project.before || "",
          after: project.after || "",
          position
        }))
      }),
      prisma.analysisInterviewQuestion.createMany({
        data: interviewQuestions.map((item, position) => ({
          analysisId: row.id,
          question: item.question || "",
          answer: item.answer || "",
          position
        }))
      })
    ]);

    updatedCount += 1;
  }

  console.log(`Backfilled ${updatedCount} analysis record(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });