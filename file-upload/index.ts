export function getDescription(): ScriptDescription {
    return {
        displayName: "File Upload",
        description:
            "Uploads a file using a specified web endpoint connector. The script will send a POST multipart request to the web endpoint connector.",
        category: "Integration",
        input: [
            {
                id: "connector",
                displayName: "Web endpoint connector",
                description:
                    "Must be a web endpoint connector pointing to an API which supports POST multipart requests. You can also append the connector with a relative path.",
                type: "Connector",
                required: true,
            },
            {
                id: "file",
                displayName: "File",
                description: "File to upload.",
                type: "InputResource",
                required: true,
            },
        ],
        output: [],
    };
}

export async function execute(context: Context): Promise<Output | void> {
    const connector = context.parameters.connector as string;
    const file = context.getFile(context.parameters.file as string);

    console.log(`Starting to upload the '${file.getName()}' file to '${connector}'.`);

    const fileExist = await file.exists();
    if (!fileExist) {
        throw new Error("Specified file doesn't exist.");
    }

    const formData = new FormData();
    formData.append(file.getName(), file);

    const response = await fetch(connector, {
        body: formData,
        method: "POST",
    });

    const resultBody = await response.text();
    if (!response.ok) {
        throw new Error(`Web endpoint error: HTTP Code ${response.status} - '${resultBody}'.`);
    }
    console.log("Upload successful.");
    console.log(`Web endpoint response: '${resultBody}'.`);
}
