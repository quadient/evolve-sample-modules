export function getDescription() {
    return {
        description: "HMAC Sign and Verify.",
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
                displayName: "CryptoSecret Parameter",
                description: "CryptoSecret parameter used as an HMAC secret.",
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
                type: "InputResource",
                required: true,
            },
        ],
        output: [
            {
                id: "isVerified",
                type: "String",
                displayName: "Is verified",
                description: "Specifies whether the file is verified or not.",
            },
        ],
    } as const satisfies ScriptDescription;
}

export async function execute(context: Context): Promise<Output> {
    const dataBytes = await readBytes(context, context.parameters.fileToSign);
    const secureByteArray = context.createSecureByteArray().append(dataBytes).append("plus we can use SecureByteArray to concat more data");
    const signatureBytes = await readBytes(context, context.parameters.fileSignature);

    const verified = await verifyContent(context, signatureBytes, secureByteArray);
    console.log("Verified: '" + verified + "'");

    return {
        isVerified: verified.toString(),
    };
}

async function verifyContent(context: Context, signatureBytes: Uint8Array, contentBytes: SecureByteArray): Promise<boolean> {
    const algorithmParams: HmacImportParams = { name: "HMAC", hash: context.parameters.hmacHashAlgorithmName };
    const keyUse: KeyUsage[] = ["verify"];
    const publicKey = await crypto.subtle.importKey("cryptosecret", context.parameters.cryptoSecretParameter, algorithmParams, false, keyUse);

    return await crypto.subtle.verify("HMAC", publicKey, signatureBytes, contentBytes);
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

function concatUint8Arrays(arrays: Uint8Array[]) {
    const flatNumberArray = arrays.reduce((accumulator, current) => {
        accumulator.push(...current);
        return accumulator;
    }, []);

    return new Uint8Array(flatNumberArray);
}
