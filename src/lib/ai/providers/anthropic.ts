import { buildAnalysisPrompt } from "@/lib/prompts";
import type { AIProvider, AnalyzeInput } from "@/lib/ai/types";
import { analysisSchema } from "@/types/analysis";

const ANTHROPIC_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    matchedKeywords: {
      type: "array",
      items: { type: "string" }
    },
    missingKeywords: {
      type: "array",
      items: { type: "string" }
    },
    suggestions: {
      type: "array",
      items: { type: "string" }
    },
    rewrittenSummary: { type: "string" },
    rewrittenProjects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          before: { type: "string" },
          after: { type: "string" }
        },
        required: ["title", "before", "after"]
      }
    },
    interviewQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer: { type: "string" }
        },
        required: ["question", "answer"]
      }
    }
  },
  required: [
    "score",
    "matchedKeywords",
    "missingKeywords",
    "suggestions",
    "rewrittenSummary",
    "rewrittenProjects",
    "interviewQuestions"
  ]
} as const;

type AnthropicResponse = {
  content?: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: "tool_use";
        id: string;
        name: string;
        input: unknown;
      }
  >;
  error?: {
    message?: string;
    type?: string;
  };
};

export class AnthropicProvider implements AIProvider {
  async analyzeResume(input: AnalyzeInput) {
    const { apiKey, model, baseURL } = input.providerConfig;

    if (!apiKey) {
      throw new Error("Missing API key for Anthropic.");
    }

    if (!model) {
      throw new Error("Missing model for Anthropic.");
    }

    const endpoint = `${(baseURL || "https://api.anthropic.com/v1").replace(/\/$/, "")}/messages`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 2400,
        system: "You are a precise resume analysis engine. Always call the resume_analysis tool exactly once.",
        messages: [
          {
            role: "user",
            content: buildAnalysisPrompt(input.resumeText, input.jobDescription)
          }
        ],
        tools: [
          {
            name: "resume_analysis",
            description: "Return the complete structured resume analysis as JSON.",
            input_schema: ANTHROPIC_ANALYSIS_SCHEMA
          }
        ],
        tool_choice: {
          type: "tool",
          name: "resume_analysis"
        }
      })
    });

    const payload = (await response.json()) as AnthropicResponse;

    if (!response.ok) {
      throw new Error(payload.error?.message || "Anthropic request failed.");
    }

    const toolUse = payload.content?.find(
      (item): item is Extract<NonNullable<AnthropicResponse["content"]>[number], { type: "tool_use" }> =>
        item.type === "tool_use" && item.name === "resume_analysis"
    );

    if (!toolUse) {
      throw new Error("Anthropic did not return structured analysis output.");
    }

    return analysisSchema.parse(toolUse.input);
  }
}
