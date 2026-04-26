const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function extractTextFromFile(file: File) {
  if (file.size === 0) {
    throw new Error("上传的文件为空。");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("上传文件不能超过 5MB。");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const lowerName = file.name.toLowerCase();
  let text = "";

  if (lowerName.endsWith(".pdf")) {
    try {
      const { default: pdfParse } = await import("pdf-parse");
      const result = await pdfParse(buffer);
      text = result.text;
    } catch {
      throw new Error("PDF 解析失败，请重新导出简历后再试，或改用 DOCX。");
    }
  } else if (lowerName.endsWith(".docx")) {
    try {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } catch {
      throw new Error("DOCX 解析失败，请重新保存文件后再上传。");
    }
  } else if (lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
    text = buffer.toString("utf-8");
  } else {
    throw new Error("仅支持 PDF、DOCX、TXT、MD 格式。");
  }

  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    throw new Error("未从上传的简历中提取到可读文本。");
  }

  return normalizedText;
}

function normalizeText(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
