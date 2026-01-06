export function getDescription() {
    return {
        description: "Fetch With Custom Timeout",
        input: [
            {
                id: "endpoint",
                displayName: "Endpoint",
                description: "URL of the endpoint to fetch data from.",
                type: "Connector",
                required: true,
            },
            {
                id: "abortRequestTimeoutInMs",
                displayName: "Abort Request Timeout in milliseconds",
                description: "Abort Request Timeout in milliseconds.",
                type: "Number",
                required: true,
            },
        ],
        output: [],
    } as const satisfies ScriptDescription;
}

export async function execute(context: Context): Promise<Output> {
    const endpoint = context.parameters.endpoint as string;
    const abortRequestTimeoutInMs = context.parameters.abortRequestTimeoutInMs as number;

    const abortController = new AbortController();
    const options = { signal: abortController.signal };

    setTimeout(() => {
        abortController.abort();
        console.log("Abort called");
    }, abortRequestTimeoutInMs);

    const response = await fetch(endpoint, options);
    const responseData = await response.text();
    console.debug(responseData);
}
