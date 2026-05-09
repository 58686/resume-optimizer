import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export type StoredFile = {
  storageKey: string;
  absolutePath?: string;
};

let s3Client: S3Client | null = null;

function buildStorageKey(userId: string, fileName: string) {
  const extension = path.extname(fileName) || ".bin";
  const datePrefix = new Date().toISOString().slice(0, 10);
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const generatedName = `${randomUUID()}${extension}`;
  return path.posix.join("uploads", safeUserId, datePrefix, generatedName);
}

function getLocalBaseDir() {
  return path.resolve(process.cwd(), env.LOCAL_STORAGE_DIR);
}

async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
}

function getS3Client() {
  if (!s3Client) {
    if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3 存储已启用，但缺少 S3_ACCESS_KEY_ID 或 S3_SECRET_ACCESS_KEY。");
    }

    s3Client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
      }
    });
  }

  return s3Client;
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (!stream) {
    return Buffer.alloc(0);
  }

  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }

  if (typeof stream === "string") {
    return Buffer.from(stream);
  }

  if (!(stream as NodeJS.ReadableStream)[Symbol.asyncIterator]) {
    return Buffer.alloc(0);
  }

  const chunks: Buffer[] = [];

  for await (const chunk of stream as AsyncIterable<Buffer | string | Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function saveLocalFile(params: {
  storageKey: string;
  buffer: Buffer;
}) {
  const absolutePath = path.join(getLocalBaseDir(), params.storageKey);
  await ensureDir(path.dirname(absolutePath));
  await writeFile(absolutePath, params.buffer);
  return {
    storageKey: params.storageKey,
    absolutePath
  };
}

async function saveS3File(params: {
  storageKey: string;
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
}) {
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.storageKey,
      Body: params.buffer,
      ContentType: params.mimeType || "application/octet-stream",
      ContentDisposition: `inline; filename="${encodeURIComponent(params.fileName)}"`
    })
  );

  return {
    storageKey: params.storageKey
  };
}

export async function saveResumeFile(params: {
  userId: string;
  fileName: string;
  buffer: Buffer;
  mimeType?: string;
}): Promise<StoredFile> {
  const storageKey = buildStorageKey(params.userId, params.fileName);

  if (env.STORAGE_DRIVER === "s3") {
    return saveS3File({
      storageKey,
      buffer: params.buffer,
      fileName: params.fileName,
      mimeType: params.mimeType
    });
  }

  return saveLocalFile({
    storageKey,
    buffer: params.buffer
  });
}

export async function readStoredFile(storageKey: string) {
  if (env.STORAGE_DRIVER === "s3") {
    const client = getS3Client();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey
      })
    );

    return streamToBuffer(response.Body);
  }

  const absolutePath = path.join(getLocalBaseDir(), storageKey);
  return readFile(absolutePath);
}

export async function deleteStoredFile(storageKey: string) {
  if (env.STORAGE_DRIVER === "s3") {
    const client = getS3Client();
    await client
      .send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: storageKey
        })
      )
      .catch(() => undefined);
    return;
  }

  const absolutePath = path.join(getLocalBaseDir(), storageKey);
  await unlink(absolutePath).catch(() => undefined);
}
