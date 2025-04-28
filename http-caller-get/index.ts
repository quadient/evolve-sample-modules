export function getDescription() {
    return {
        description: "HTTP Caller GET",
        input: [
            {
                id: "get",
                displayName: "URL GET",
                description: "URL to call - method GET",
                type: "Connector",
            },
        ],
        output: [],
    } as const satisfies ScriptDescription;
}

export async function execute(context): Promise<Output> {
    const requestEndpoint = context.parameters.get;
    const response = await fetch(requestEndpoint);
    console.debug(response.json());
}
