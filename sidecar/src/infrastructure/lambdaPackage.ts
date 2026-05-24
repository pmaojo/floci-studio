import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

interface ZipEntry {
  name: string;
  content: Uint8Array;
}

export type LambdaCodeInput =
  | { mode: 'template' }
  | { mode: 'inline'; fileName: string; source: string }
  | { mode: 'files'; files: Array<{ fileName: string; source: string }> }
  | { mode: 'zipBase64'; zipBase64: string };

export interface PreparedLambdaPackage {
  zipPath: string;
  cleanup: () => Promise<void>;
}

export interface RuntimeTemplate {
  runtime: string;
  fileName: string;
  handler: string;
  source: string;
}

const textEncoder = new TextEncoder();

const runtimeTemplates: RuntimeTemplate[] = [
  {
    runtime: 'nodejs18.x',
    fileName: 'index.js',
    handler: 'index.handler',
    source: `exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from Floci Lambda",
      event
    })
  };
};
`,
  },
  {
    runtime: 'python3.9',
    fileName: 'index.py',
    handler: 'index.handler',
    source: `import json


def handler(event, context):
    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Hello from Floci Lambda",
            "event": event,
        }),
    }
`,
  },
];

let crc32Table: Uint32Array | null = null;

export const getRuntimeTemplates = () => runtimeTemplates;

export const getRuntimeTemplate = (runtime: string) => {
  return runtimeTemplates.find((template) => template.runtime === runtime);
};

export const prepareLambdaPackage = async (runtime: string, code: LambdaCodeInput): Promise<PreparedLambdaPackage> => {
  const workingDirectory = await mkdtemp(path.join(tmpdir(), 'floci-lambda-'));
  const zipPath = path.join(workingDirectory, 'function.zip');
  const cleanup = () => rm(workingDirectory, { recursive: true, force: true });

  try {
    if (code.mode === 'zipBase64') {
      await writeFile(zipPath, Buffer.from(stripBase64Prefix(code.zipBase64), 'base64'));
      return { zipPath, cleanup };
    }

    const entries = resolveZipEntries(runtime, code);
    await writeFile(zipPath, createZipArchive(entries));
    return { zipPath, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
};

const resolveZipEntries = (runtime: string, code: Exclude<LambdaCodeInput, { mode: 'zipBase64' }>): ZipEntry[] => {
  if (code.mode === 'template') {
    const template = getRuntimeTemplate(runtime);
    if (!template) {
      throw new Error(`Runtime ${runtime} requires an uploaded deployment ZIP.`);
    }

    return [{ name: template.fileName, content: textEncoder.encode(template.source) }];
  }

  if (code.mode === 'inline') {
    return [{
      name: sanitizeZipEntryName(code.fileName),
      content: textEncoder.encode(code.source),
    }];
  }

  return code.files.map((file) => ({
    name: sanitizeZipEntryName(file.fileName),
    content: textEncoder.encode(file.source),
  }));
};

const stripBase64Prefix = (value: string) => {
  return value.replace(/^data:.*?;base64,/, '');
};

const sanitizeZipEntryName = (fileName: string) => {
  const normalized = fileName.replaceAll('\\', '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);

  if (parts.length === 0 || parts.some((part) => part === '.' || part === '..')) {
    throw new Error(`Invalid ZIP entry path: ${fileName}`);
  }

  return parts.join('/');
};

const getCrc32Table = () => {
  if (crc32Table) return crc32Table;

  crc32Table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crc32Table[index] = value >>> 0;
  }

  return crc32Table;
};

const calculateCrc32 = (bytes: Uint8Array) => {
  const table = getCrc32Table();
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
};

const createHeader = (length: number) => {
  const bytes = new Uint8Array(length);
  return { bytes, view: new DataView(bytes.buffer) };
};

const concatenate = (parts: Uint8Array[]) => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
};

const createZipArchive = (entries: ZipEntry[]) => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const fileName = textEncoder.encode(entry.name);
    const content = entry.content;
    const crc32 = calculateCrc32(content);

    const localHeader = createHeader(30);
    localHeader.view.setUint32(0, 0x04034b50, true);
    localHeader.view.setUint16(4, 20, true);
    localHeader.view.setUint16(6, 0, true);
    localHeader.view.setUint16(8, 0, true);
    localHeader.view.setUint16(10, 0, true);
    localHeader.view.setUint16(12, 0, true);
    localHeader.view.setUint32(14, crc32, true);
    localHeader.view.setUint32(18, content.length, true);
    localHeader.view.setUint32(22, content.length, true);
    localHeader.view.setUint16(26, fileName.length, true);
    localHeader.view.setUint16(28, 0, true);

    const localFile = concatenate([localHeader.bytes, fileName, content]);
    localParts.push(localFile);

    const centralHeader = createHeader(46);
    centralHeader.view.setUint32(0, 0x02014b50, true);
    centralHeader.view.setUint16(4, 20, true);
    centralHeader.view.setUint16(6, 20, true);
    centralHeader.view.setUint16(8, 0, true);
    centralHeader.view.setUint16(10, 0, true);
    centralHeader.view.setUint16(12, 0, true);
    centralHeader.view.setUint16(14, 0, true);
    centralHeader.view.setUint32(16, crc32, true);
    centralHeader.view.setUint32(20, content.length, true);
    centralHeader.view.setUint32(24, content.length, true);
    centralHeader.view.setUint16(28, fileName.length, true);
    centralHeader.view.setUint16(30, 0, true);
    centralHeader.view.setUint16(32, 0, true);
    centralHeader.view.setUint16(34, 0, true);
    centralHeader.view.setUint16(36, 0, true);
    centralHeader.view.setUint32(38, 0, true);
    centralHeader.view.setUint32(42, localOffset, true);
    centralParts.push(concatenate([centralHeader.bytes, fileName]));

    localOffset += localFile.length;
  }

  const centralDirectory = concatenate(centralParts);
  const endOfCentralDirectory = createHeader(22);
  endOfCentralDirectory.view.setUint32(0, 0x06054b50, true);
  endOfCentralDirectory.view.setUint16(4, 0, true);
  endOfCentralDirectory.view.setUint16(6, 0, true);
  endOfCentralDirectory.view.setUint16(8, entries.length, true);
  endOfCentralDirectory.view.setUint16(10, entries.length, true);
  endOfCentralDirectory.view.setUint32(12, centralDirectory.length, true);
  endOfCentralDirectory.view.setUint32(16, localOffset, true);
  endOfCentralDirectory.view.setUint16(20, 0, true);

  return concatenate([...localParts, centralDirectory, endOfCentralDirectory.bytes]);
};
