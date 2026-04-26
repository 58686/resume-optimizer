import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category: "verify-email" | "password-reset";
};

export type EmailDeliveryResult = {
  mode: "console" | "file";
  previewPath: string | null;
};

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getOutboxDir() {
  return path.resolve(process.cwd(), env.EMAIL_OUTBOX_DIR);
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<EmailDeliveryResult> {
  const rendered = [
    `From: ${env.EMAIL_FROM}`,
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    "",
    payload.text
  ].join("\n");

  if (env.EMAIL_DELIVERY_MODE === "console") {
    console.log(`[email:${payload.category}]`);
    console.log(rendered);

    return {
      mode: "console",
      previewPath: null
    };
  }

  const datePrefix = new Date().toISOString().slice(0, 10);
  const fileName = `${Date.now()}-${payload.category}-${sanitizeFilePart(payload.to)}-${randomUUID()}.json`;
  const previewPath = path.join(getOutboxDir(), datePrefix, fileName);

  await mkdir(path.dirname(previewPath), { recursive: true });
  await writeFile(
    previewPath,
    JSON.stringify(
      {
        from: env.EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        category: payload.category,
        text: payload.text,
        html: payload.html ?? null,
        createdAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    mode: "file",
    previewPath
  };
}
