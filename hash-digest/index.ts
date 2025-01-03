export function getDescription() {
    return {
        description: "Generates a MAC signed link.",
        input: [
            {
                id: "baseUrl",
                displayName: "Base URL",
                description: "Base URL for the third party.",
                type: "String",
                required: true,
            },
            {
                id: "secret",
                displayName: "Secret",
                description: "Secret key connector used for signing.",
                type: "CryptoSecret",
                required: true,
            },
        ],
        output: [
            {
                id: "signedUrl",
                type: "String",
                displayName: "Signed URL",
                description: "Signed URL.",
            },
        ],
    } as const satisfies ScriptDescription;
}

export async function execute(context: Context): Promise<Output> {
    const baseUrl = context.parameters.baseUrl as string;
    const secret = context.parameters.secret as CryptoSecret;

    const timestamp = new Date().toISOString();
    const url = `${baseUrl}?signed=true&ts=${timestamp}`;
    const urlSignature = await sign(context, url, secret);

    const signedUrl = `${url}&mac=${urlSignature}`;
    console.log(`Signed url: ${signedUrl}`);

    return {
        signedUrl: signedUrl,
    };
}

async function sign(context: Context, url: string, secret: CryptoSecret): Promise<string> {
    const secureByteArray = context.createSecureByteArray().append(url).append(secret);
    const hashedUrl = await crypto.subtle.digest("SHA-256", secureByteArray);
    return bytesToBase64(hashedUrl);
}
