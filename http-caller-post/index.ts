export function getDescription() {
    return {
        description: "HTTP Caller POST",
        input: [
            {
                id: "post",
                displayName: "URL POST",
                description: "URL to call - method POST",
                type: "Connector",
            },
            {
                id: "body",
                displayName: "Body",
                description: "Body to send to the endpoint",
                type: "String", 
            }
        ],
        output: [],
    } as const satisfies ScriptDescription;
}

export async function execute(context): Promise<Output> {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Accept", "application/json");
    const body = context.parameters.body;

    const requestOptions = {
        headers: headers,
        method: "POST",
        body: body,
    };

    const requestEndpoint = context.parameters.post;
    const response = await fetch(requestEndpoint, requestOptions);
    const responseJson = await response.json();
    console.debug(responseJson);
}
