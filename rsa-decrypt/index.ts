export function getDescription() {
    return {
        description: "RSA Decrypt.",
        input: [
            {
                id: "fileToDecrypt",
                displayName: "File to be decrypted",
                description: "File to be decrypted.",
                type: "InputResource",
                required: true,
                defaultValue: "blob://file.encrypted",
            },
            {
                id: "privateCertificate",
                displayName: "Private Certificate",
                description: "Private certificate used for decryption.",
                type: "Certificate",
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
                id: "decryptedFile",
                displayName: "Decrypted file",
                description: "Contains the decrypted data (type Connector is used because this files is written and read in this example).",
                type: "Connector",
                required: true,
                defaultValue: "blob://decryptedFile.txt",
            },
        ],
        output: [],
    } as const satisfies ScriptDescription;
}

export async function execute(context: Context): Promise<Output> {
    const fileToDecrypt = context.getFile(context.parameters.fileToDecrypt);
    const decryptedFile = context.getFile(context.parameters.decryptedFile);

    const privateKey = await importPrivateKey(context);
    console.log("Private key imported");

    await crypto.subtle.decrypt("RSA-OAEP", privateKey, fileToDecrypt, decryptedFile);
    console.log("File decrypted");

    // Only for an example purpose
    await checkDecrypted(decryptedFile);
}

async function importPrivateKey(context: Context): Promise<CryptoKey> {
    const algorithmParams: RsaOaepParams = { name: "RSA-OAEP", hash: context.parameters.rsaHashAlgorithmName };
    const keyUse = ["decrypt"];

    return await crypto.subtle.importKey("pkcs8fromparameterinput", context.parameters.certificate, algorithmParams, false, keyUse);
}

async function checkDecrypted(decryptedFile: File): Promise<void> {
    const decryptedData = await decryptedFile.read();
    const expectedData = "this will be encrypted"; // This is the original data used in the encryption example

    console.log(
        `Decrypted data: '${decryptedData}' is the same as the original data: '${expectedData}' -> '${decryptedData === expectedData}'`
    );
}
