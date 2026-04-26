export function buildAnalysisPrompt(resumeText: string, jobDescription: string) {
  return `
You are an expert recruiter and resume editor.
Return only valid JSON with this exact shape:
{
  "score": number,
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "suggestions": string[],
  "rewrittenSummary": string,
  "rewrittenProjects": [{ "title": string, "before": string, "after": string }],
  "interviewQuestions": [{ "question": string, "answer": string }]
}

Scoring rules:
- Score from 0 to 100.
- Keep suggestions specific and actionable.
- Rewrite content so it sounds stronger but remains plausible.
- Interview answers should be concise and role-focused.

Resume:
${resumeText}

Job Description:
${jobDescription}
`.trim();
}

export function buildKeywordsPrompt(resumeText: string, jobDescription: string) {
  return `
Analyze the resume against the job description.
Return only structured data for:
- score
- matchedKeywords
- missingKeywords

Rules:
- Score from 0 to 100.
- Keep keywords short and role-specific.
- Prefer terms that appear in the job description or are strongly implied by it.
- Do not include explanations.

Resume:
${resumeText}

Job Description:
${jobDescription}
`.trim();
}

export function buildSuggestionsPrompt(
  resumeText: string,
  jobDescription: string,
  matchedKeywords: string[],
  missingKeywords: string[]
) {
  return `
Analyze the resume against the job description.
Return only structured data for:
- suggestions

Rules:
- Provide 4 to 6 actionable suggestions.
- Prioritize missing keywords, weak project framing, and role-fit expression.
- Keep each suggestion concise but specific.

Matched Keywords:
${matchedKeywords.join(", ") || "None"}

Missing Keywords:
${missingKeywords.join(", ") || "None"}

Resume:
${resumeText}

Job Description:
${jobDescription}
`.trim();
}

export function buildSummaryPrompt(resumeText: string, jobDescription: string) {
  return `
Rewrite the candidate summary for the target role.
Return only structured data for:
- rewrittenSummary

Rules:
- Write one concise professional summary in Chinese.
- Keep it plausible and grounded in the resume.
- Emphasize role fit, strengths, and relevant stack.

Resume:
${resumeText}

Job Description:
${jobDescription}
`.trim();
}

export function buildProjectsPrompt(resumeText: string, jobDescription: string) {
  return `
Rewrite the most relevant projects in the resume for the target role.
Return only structured data for:
- rewrittenProjects

Rules:
- Return up to 3 projects.
- Each item must contain title, before, after.
- "before" should be a short excerpt or summary of the original wording.
- "after" should be a stronger, role-focused rewrite in Chinese.

Resume:
${resumeText}

Job Description:
${jobDescription}
`.trim();
}

export function buildKeywordExamplesPrompt(
  missingKeywords: string[],
  resumeText: string,
  jobDescription: string
) {
  return `
You are an expert resume writer. For each missing keyword, write ONE concise bullet-point sentence (in Chinese) that naturally integrates the keyword into the candidate's resume experience. The sentence must:
- Sound authentic and grounded in the resume context
- Be suitable for a resume bullet point (action verb start, quantified where possible)
- Naturally include the keyword without forcing it

Return only valid JSON:
{ "examples": [{ "keyword": string, "example": string }] }

Missing keywords: ${missingKeywords.join(", ")}

Resume context:
${resumeText.slice(0, 3000)}

Job Description:
${jobDescription.slice(0, 2000)}
`.trim();
}

export function buildInterviewPrompt(
  resumeText: string,
  jobDescription: string,
  suggestions: string[]
) {
  return `
Prepare likely interview questions and concise answers for this candidate and role.
Return only structured data for:
- interviewQuestions

Rules:
- Return 4 to 6 question-answer pairs.
- Questions should focus on projects, architecture, tradeoffs, and job fit.
- Answers should be concise, plausible, and in Chinese.

Optimization Focus:
${suggestions.join("\n") || "None"}

Resume:
${resumeText}

Job Description:
${jobDescription}
`.trim();
}
