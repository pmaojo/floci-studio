interface ZipEntry {
  name: string;
  content: string;
}

interface LambdaDeploymentPackage {
  handler: string;
  zipFile: Uint8Array;
}

const textEncoder = new TextEncoder();

const lambdaSources: Record<string, ZipEntry> = {
  'nodejs18.x': {
    name: 'index.js',
    content: `exports.handler = async (event) => {
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
  'python3.9': {
    name: 'index.py',
    content: `import json


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
};

let crc32Table: Uint32Array | null = null;

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
    const content = textEncoder.encode(entry.content);
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

export const supportsInlineLambdaPackage = (runtime: string) => runtime in lambdaSources;

export const createLambdaDeploymentPackage = (runtime: string): LambdaDeploymentPackage => {
  const source = lambdaSources[runtime];
  if (!source) {
    throw new Error(`Runtime ${runtime} requires a compiled deployment artifact.`);
  }

  return {
    handler: 'index.handler',
    zipFile: createZipArchive([source]),
  };
};
