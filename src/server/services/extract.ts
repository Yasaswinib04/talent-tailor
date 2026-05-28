import * as pdfjsLib from 'pdfjs-dist';

const WORKER_SRC = pdfjsLib.GlobalWorkerOptions.workerSrc;

pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;

let workerInitialized = false;

async function ensureWorker() {
  if (workerInitialized) return;
  workerInitialized = true;
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length * 0.3);
}

function buildMarkdownText(pageTexts: string[]): string {
  const raw = pageTexts.join('\n\n');
  const lines = raw.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }

    if (/^(EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT|WORK HISTORY)/i.test(trimmed)) {
      result.push(`## ${trimmed}`);
    } else if (/^(EDUCATION|ACADEMIC|QUALIFICATION|ACADEMIC BACKGROUND)/i.test(trimmed)) {
      result.push(`## ${trimmed}`);
    } else if (/^(SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|AREAS OF EXPERTISE|PROFICIENCIES)/i.test(trimmed)) {
      result.push(`## ${trimmed}`);
    } else if (/^(PROJECTS|KEY PROJECTS|PERSONAL PROJECTS)/i.test(trimmed)) {
      result.push(`## ${trimmed}`);
    } else if (/^(SUMMARY|PROFESSIONAL SUMMARY|PROFILE|OBJECTIVE|CAREER OBJECTIVE)/i.test(trimmed)) {
      result.push(`## ${trimmed}`);
    } else if (/^(CERTIFICATIONS|CERTIFICATES|LICENSES)/i.test(trimmed)) {
      result.push(`## ${trimmed}`);
    } else if (/^(ACHIEVEMENTS|AWARDS|HONORS)/i.test(trimmed)) {
      result.push(`## ${trimmed}`);
    } else if (/^(LANGUAGES|PERSONAL DETAILS|CONTACT|REFERENCES)/i.test(trimmed)) {
      result.push(`## ${trimmed}`);
    } else if (/^(CONTACT|PHONE|EMAIL|ADDRESS|LOCATION)/i.test(trimmed) && !trimmed.includes(':')) {
      result.push(`## ${trimmed}`);
    } else {
      result.push(trimmed);
    }
  }

  return result.join('\n');
}

export async function extractResumeText(
  buffer: Buffer | ArrayBuffer,
  mimeType: string = 'application/pdf'
): Promise<{ text: string; tokenCount: number; isScanned: boolean }> {
  await ensureWorker();

  if (mimeType === 'application/pdf') {
    try {
      const data = buffer instanceof ArrayBuffer ? buffer : buffer.buffer.slice(
        buffer.byteOffset, buffer.byteOffset + buffer.byteLength
      );
      const loadingTask = pdfjsLib.getDocument({ data, disableAutoFetch: false });
      const pdf = await loadingTask.promise;

      const pageTexts: string[] = [];
      let totalChars = 0;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => {
            if (item.str) return item.str;
            return '';
          })
          .filter((s: string) => s.trim().length > 0)
          .join(' ');

        totalChars += pageText.length;
        if (pageText.trim()) {
          pageTexts.push(pageText);
        }
      }

      const isScanned = totalChars < 50;
      const markdown = buildMarkdownText(pageTexts);
      return {
        text: markdown,
        tokenCount: estimateTokenCount(markdown),
        isScanned
      };
    } catch (err: any) {
      throw new Error(`PDF extraction failed: ${err.message}`);
    }
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    throw new Error('DOCX extraction is not yet supported. Please upload as PDF or paste text.');
  }

  if (mimeType.startsWith('image/')) {
    throw new Error('Image-based resumes require OCR. Please upload a text-based PDF or paste resume content.');
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

export { estimateTokenCount };
