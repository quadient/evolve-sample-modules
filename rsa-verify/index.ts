export function getDescription() {
    return {
        description: "RSA Verify.",
        input: [
            {
                id: "fileToVerify",
                displayName: "Large file to be verified",
                description: "Large file to be verified.",
                type: "InputResource",
                required: true,
            },
            {
                id: "publicCertificate",
                displayName: "Public Certificate",
                description: "Public certificate used for verifying.",
                type: "Certificate",
                required: true,
            },
            {
                id: "rsaAlgorithmName",
                displayName: "RSA algorithm name (RSASSA-PKCS1-v1_5, RSA-PSS)",
                description: "Name of the RSA algorithm (RSASSA-PKCS1-v1_5, RSA-PSS).",
                type: "String",
                defaultValue: "RSASSA-PKCS1-v1_5",
                required: true,
            },
            {
                id: "rsaHashAlgorithmName",
                displayName: "RSA hash algorithm name (SHA-1, SHA-256, SHA-384, SHA-512)",
                description: "Name of the RSA hash algorithm  (SHA-1, SHA-256, SHA-384, SHA-512).",
                type: "String",
                defaultValue: "SHA-256",
                required: true,
            },
            {
                id: "fileSignature",
                displayName: "Output file signature",
                description: "Contains the created signature (type Connector used because this files is written and read in this example).",
                type: "Connector",
                required: true,
            },
        ],
        output: [
            {
                id: "isVerified",
                type: "String",
                displayName: "Is verified",
                description: "Is verified.",
            },
        ],
    } as const satisfies ScriptDescription;
}

export async function execute(context: Context): Promise<Output> {
    const fileToVerify = context.getFile(context.parameters.fileToVerify);
    const signatureBytes = await readBytes(context, context.parameters.fileSignature);

    const verified = await verifyContent(context, signatureBytes, fileToVerify);
    console.log("Verified: '" + verified + "'");

    return {
        isVerified: verified.toString(),
    };
}

async function verifyContent(context: Context, signatureBytes: Uint8Array, fileToVerify: IFile): Promise<boolean> {
    const algorithmParams = { name: context.parameters.rsaAlgorithmName, hash: context.parameters.rsaHashAlgorithmName };
    const keyUse = ["verify"];
    const publicKey = await crypto.subtle.importKey("spkifromparameterinput", context.parameters.publicCertificate, algorithmParams, false, keyUse);

    return await crypto.subtle.verify(context.parameters.rsaAlgorithmName, publicKey, signatureBytes, fileToVerify);
}

async function readBytes(context: Context, filePath: string): Promise<Uint8Array> {
    console.log("read: " + filePath);
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
