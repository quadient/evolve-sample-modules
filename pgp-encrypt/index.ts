export function getDescription() {
    return {
        description: "PGP Encrypt.",
        input: [
            {
                id: "fileToEncrypt",
                displayName: "File to be encrypted",
                description: "File to be encrypted (type Connector used because this files is written and read in this example).",
                type: "Connector",
                required: true,
                defaultValue: "blob://fileToEncrypt.txt",
            },
            {
                id: "publicCertificate",
                displayName: "Public Certificate",
                description: "Public certificate used for encryption.",
                type: "Certificate",
                required: true,
            },
            {
                id: "symmetricAlgorithmName",
                displayName: "Symmetric algorithm name (Idea, TripleDes, Cast5, Blowfish, Des, Aes128, Aes192, Aes256, Twofish, Camellia128, Camellia192, Camellia256)",
                description: "Name of the RSA hash algorithm  (Idea, TripleDes, Cast5, Blowfish, Des, Aes128, Aes192, Aes256, Twofish, Camellia128, Camellia192, Camellia256).",
                type: "String",
                defaultValue: "Aes256",
                required: true,
            },
            {
                id: "encryptedFile",
                displayName: "Encrypted file",
                description: "Contains the encrypted data (type Connector is used because this files is written and read in this example).",
                type: "Connector",
                required: true,
                defaultValue: "blob://file.encrypted",
            },
        ],
        output: [],
    } as const satisfies ScriptDescription;
}

export async function execute(context: Context): Promise<Output> {
    const fileToEncrypt = context.getFile(context.parameters.fileToEncrypt);
    const encryptedFile = context.getFile(context.parameters.encryptedFile);

    // Example data to encrypt; only for an example purpose
    await fileToEncrypt.write("this will be encrypted");
    console.log("Example data written to the file for the encryption");

    const publicKey = await importPublicKey(context);
    console.log("Public key imported");

    await crypto.subtle.encrypt("PGP", publicKey, fileToEncrypt, encryptedFile);
    console.log("File encrypted");
}

async function importPublicKey(context: Context): Promise<CryptoKey> {
    const algorithmParams: PgpParams = {
        name: "PGP",
        symmetricKeyAlgorithm: context.parameters.symmetricAlgorithmName as PgpSymmetricKeyAlgorithm,
        enableArmor: false,
        enableIntegrityCheck: true,
        compressionAlgorithm: "zlib",
        compressionLevel: 6,
    };
    const keyUse: KeyUsage[] = ["encrypt"];

    return await crypto.subtle.importKey("spkifromparameterinput", context.parameters.publicCertificate, algorithmParams, false, keyUse);
}
