export function getDescription() {
    return {
        description: "PGP Decrypt.",
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

    await crypto.subtle.decrypt("PGP", privateKey, fileToDecrypt, decryptedFile);
    console.log("File decrypted");

    // Only for an example purpose
    await checkDecrypted(decryptedFile);
}

async function importPrivateKey(context: Context): Promise<CryptoKey> {
    const algorithmParams: PgpParams = { name: "PGP" };
    const keyUse: KeyUsage = ["decrypt"];

    return await crypto.subtle.importKey("pkcs8fromparameterinput", context.parameters.privateCertificate, algorithmParams, false, keyUse);
}

async function checkDecrypted(decryptedFile: IFile): Promise<void> {
    const decryptedData = await decryptedFile.read();
    const expectedData = "this will be encrypted"; // This is the original data used in the encryption example

    console.log(
        `Decrypted data: '${decryptedData}' is the same as the original data: '${expectedData}' -> '${decryptedData === expectedData}'`
    );
    if (decryptedData !== expectedData) {
        throw new Error("Decrypted data does not match the original data.");
    }
}
