export const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"]);

function getLowerFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

export function validateResumeFile(file: { name: string; size: number }) {
  if (file.size === 0) {
    throw new Error("上传的文件为空。");
  }

  if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
    throw new Error("上传文件不能超过 5MB。");
  }

  if (!SUPPORTED_EXTENSIONS.has(getLowerFileExtension(file.name))) {
    throw new Error("仅支持 PDF、DOCX、TXT、MD 格式。");
  }
}

export async function extractTextFromResumeFile(params: {
  fileName: string;
  size: number;
  buffer: Buffer;
}) {
  validateResumeFile({ name: params.fileName, size: params.size });

  const extension = getLowerFileExtension(params.fileName);
  let text = "";

  if (extension === ".pdf") {
    try {
      const { default: pdfParse } = await import("pdf-parse");
      const result = await pdfParse(params.buffer);
      text = result.text;
    } catch {
      throw new Error("PDF 解析失败，请重新导出简历后再试，或改用 DOCX。");
    }
  } else if (extension === ".docx") {
    try {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer: params.buffer });
      text = result.value;
    } catch {
      throw new Error("DOCX 解析失败，请重新保存文件后再上传。");
    }
  } else {
    text = params.buffer.toString("utf-8");
  }

  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    throw new Error("未从上传的简历中提取到可读文本。");
  }

  return normalizedText;
}

export async function extractTextFromFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return extractTextFromResumeFile({
    fileName: file.name,
    size: file.size,
    buffer: Buffer.from(arrayBuffer)
  });
}

function normalizeText(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
