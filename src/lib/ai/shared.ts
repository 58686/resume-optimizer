import OpenAI from "openai";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import { env } from "@/lib/env";
import { analysisSchema, type AnalysisResult } from "@/types/analysis";
import type { AnalyzeInput, AIApiKeyMode, AIProtocol } from "@/lib/ai/types";
import type { ZodType } from "zod";

type OpenAICompatibleConfig = {
  apiKey: string;
  baseURL?: string;
  model: string;
  protocol: AIProtocol;
  apiKeyMode: AIApiKeyMode;
  providerLabel: string;
  defaultHeaders?: Record<string, string>;
  maxTokens?: number;
  proxy?: string;
};

const MODEL_REQUEST_TIMEOUT_MS = env.ANALYSIS_TASK_TIMEOUT_MS;

function applyApiKeyHeader(headers: Headers, apiKey: string, apiKeyMode: AIApiKeyMode) {
  headers.delete("authorization");

  switch (apiKeyMode) {
    case "api_key_header":
      headers.set("api-key", apiKey);
      headers.delete("x-api-key");
      break;
    case "x_api_key_header":
      headers.set("x-api-key", apiKey);
      headers.delete("api-key");
      break;
    case "bearer":
    default:
      headers.set("authorization", `Bearer ${apiKey}`);
      headers.delete("api-key");
      headers.delete("x-api-key");
      break;
  }
}

function createFetch(config: OpenAICompatibleConfig): typeof fetch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dispatcher = config.proxy ? new (require("undici").ProxyAgent)(config.proxy) : undefined;

  return async (input, init) => {
    const needsCustomAuth = config.apiKeyMode !== "bearer";

    if (!needsCustomAuth && !dispatcher) {
      return fetch(input, init);
    }

    const request = new Request(input as RequestInfo, init);
    const headers = new Headers(request.headers);

    if (needsCustomAuth) {
      applyApiKeyHeader(headers, config.apiKey, config.apiKeyMode);
    }

    const fetchInit: RequestInit & { dispatcher?: unknown } = {
      method: request.method,
      headers,
      body: request.body,
      // @ts-expect-error - duplex is required for streaming request bodies in Node fetch
      duplex: "half"
    };
    if (dispatcher) {
      fetchInit.dispatcher = dispatcher;
    }

    return fetch(input as RequestInfo, fetchInit as RequestInit);
  };
}

function createMessages(systemPrompt: string, userPrompt: string) {
  return [
    {
      role: "system" as const,
      content: systemPrompt
    },
    {
      role: "user" as const,
      content: userPrompt
    }
  ];
}

async function generateWithResponsesApi<T>(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  schema: ZodType<T>,
  schemaName: string,
  config: OpenAICompatibleConfig
): Promise<T> {
  const response = await client.responses.parse({
    model: config.model,
    input: createMessages(systemPrompt, userPrompt),
    text: {
      format: zodTextFormat(schema, schemaName)
    },
    ...(config.maxTokens ? { max_output_tokens: config.maxTokens } : {})
  });

  if (!response.output_parsed) {
    throw new Error(`${config.providerLabel} did not return a parsed analysis result.`);
  }

  return response.output_parsed;
}

async function generateWithChatCompletionsApi<T>(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  schema: ZodType<T>,
  schemaName: string,
  config: OpenAICompatibleConfig
): Promise<T> {
  const completion = await client.beta.chat.completions.parse({
    model: config.model,
    messages: createMessages(systemPrompt, userPrompt),
    response_format: zodResponseFormat(schema, schemaName),
    ...(config.maxTokens ? { max_tokens: config.maxTokens } : {})
  });

  const parsed = completion.choices[0]?.message?.parsed;

  if (!parsed) {
    throw new Error(`${config.providerLabel} did not return a parsed analysis result.`);
  }

  return parsed;
}

export async function generateStructuredWithOpenAICompatible<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: ZodType<T>,
  schemaName: string,
  config: OpenAICompatibleConfig
): Promise<T> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: config.defaultHeaders,
    fetch: createFetch(config),
    maxRetries: 0,
    timeout: MODEL_REQUEST_TIMEOUT_MS
  });

  if (config.protocol === "chat_completions") {
    return generateWithChatCompletionsApi(client, systemPrompt, userPrompt, schema, schemaName, config);
  }

  return generateWithResponsesApi(client, systemPrompt, userPrompt, schema, schemaName, config);
}

export async function analyzeWithOpenAICompatible(
  input: AnalyzeInput,
  config: OpenAICompatibleConfig
): Promise<AnalysisResult> {
  return generateStructuredWithOpenAICompatible(
    "You are a precise resume analysis engine. Output only structured data.",
    `Analyze the following resume against the target job description and return the full structured result.\n\nResume:\n${input.resumeText}\n\nJob Description:\n${input.jobDescription}`,
    analysisSchema,
    "resume_analysis",
    config
  );
}
