export function getDescription() {
    return {
        description: "HMAC signing.",
        input: [
            {
                id: "fileToSign",
                displayName: "File to be signed",
                description: "File to be signed.",
                type: "InputResource",
                required: true,
            },
            {
                id: "cryptoSecretParameter",
                displayName: "CryptoSecret parameter",
                description: "CryptoSecret parameter to be used as an HMAC secret.",
                type: "CryptoSecret",
                required: true,
            },
            {
                id: "hmacHashAlgorithmName",
                displayName: "HMAC hash algorithm name (SHA-1, SHA-256, SHA-384, SHA-512)",
                description: "Name of the HMAC hash algorithm (SHA-1, SHA-256, SHA-384, SHA-512).",
                type: "String",
                defaultValue: "SHA-256",
                required: true,
            },
            {
                id: "fileSignature",
                displayName: "File signature",
                description: "File signature.",
                type: "OutputResource",
                required: true,
            },
        ],
        output: [],
    } as const satisfies ScriptDescription;
}

export async function execute(context: Context): Promise<Output> {
    const dataBytes = await readBytes(context, context.parameters.fileToSign);
    const secureByteArray = context.createSecureByteArray().append(dataBytes).append("plus we can use SecureByteArray to concat more data");

    const signatureBytes = await signContent(context, secureByteArray);
    await writeBytes(context, context.parameters.fileSignature, signatureBytes);
}

async function signContent(context: Context, contentBytes: SecureByteArray): Promise<ArrayBuffer> {
    const algorithmParams: HmacImportParams = { name: "HMAC", hash: context.parameters.hmacHashAlgorithmName };
    const keyUse: KeyUsage[] = ["sign"];
    const privateKey = await crypto.subtle.importKey("cryptosecret", context.parameters.cryptoSecretParameter, algorithmParams, false, keyUse);

    return await crypto.subtle.sign("HMAC", privateKey, contentBytes);
}

async function readBytes(context: Context, filePath: string): Promise<Uint8Array> {
    const readableStream = await context.openRead(filePath);

    const values: Uint8Array[] = [];
    for await (const value of readableStream) {
        values.push(value);
    }

    const contentBytes = concatUint8Arrays(values);

    return contentBytes;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const flatNumberArray = arrays.reduce((accumulator, current) => {
        accumulator.push(...current);
        return accumulator;
    }, []);

    return new Uint8Array(flatNumberArray);
}

async function writeBytes(context: Context, filePath: string, bytes: ArrayBuffer): Promise<void> {
    const fileWriteStream = await context.openWrite(filePath);

    const fileWriter = fileWriteStream.getWriter();
    await fileWriter.write(bytes);

    await fileWriter.close();
    fileWriter.releaseLock();
}
