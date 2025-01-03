export function getDescription(): ScriptDescription {
    return {
        displayName: "Resource Copy",
        description: "Copies an input resource into an output resource.",
        category: "Utilities",
        input: [
            {
                id: "source",
                displayName: "Source",
                description: "Source input resource that will be copied.",
                type: "InputResource",
                required: true,
            },
            {
                id: "target",
                displayName: "Target",
                description: "Target output resource the source will be copied to.",
                type: "OutputResource",
                required: true,
            },
            {
                id: "strategy",
                displayName: "Strategy",
                description:
                    "Specifies the copying strategy, i.e. determines what action is taken if the target resource already exists: " +
                    `${Strategy.Overwrite} - Overwrites the existing resource. ` +
                    `${Strategy.Skip} - Does not overwrite the existing resource, i.e. the source resource is skipped (not copied). ` +
                    `${Strategy.Fail} - Ends the processing of the pipeline, i.e. the run ends in the Failed state.`,
                type: "Selection",
                options: [Strategy.Overwrite, Strategy.Skip, Strategy.Fail],
                defaultValue: Strategy.Overwrite,
                required: false,
            },
        ],
        output: [],
    };
}

export async function execute(context: Context): Promise<Output | void> {
    const sourceFilePath = context.parameters.source as string;
    const targetFilePath = context.parameters.target as string;
    const strategy = context.parameters.strategy as string;

    console.log(`Starting to copy the resource from '${sourceFilePath}' (source file) to '${targetFilePath}' (target file) using the '${strategy}' strategy.`);

    const targetFile = context.getFile(targetFilePath);

    if (!(await canCopyFile(strategy, targetFile))) {
        console.log("Target resource already exists.");
        return;
    }

    const reader = await context.openRead(sourceFilePath);
    const writer = await context.openWrite(targetFilePath);

    await reader
        .pipeTo(writer)
        .then(copySuccessfulHandler)
        .catch(async (copyingException) => await copyUnsuccessfulHandler(context, targetFilePath, copyingException));
}

function copySuccessfulHandler() {
    console.log("Copying successful.");
}

async function copyUnsuccessfulHandler(context: Context, targetFilePath: string, copyingException: Error): Promise<void> {
    try {
        await context.getFile(targetFilePath).delete();
    } finally {
        throw copyingException;
    }
}

async function canCopyFile(strategy: string, targetFile: IFile): Promise<boolean> {
    switch (strategy) {
        case Strategy.Overwrite:
            return true;
        case Strategy.Skip:
        case Strategy.ErrorRecovery:
            if (await targetFile.exists()) return false;
            return true;
        case Strategy.Fail:
            if (await targetFile.exists()) throw new Error(`Target resource '${targetFile.getPath()}' already exists.`);
            return true;
        default:
            throw new Error(`Unsupported Strategy type: ${strategy}`);
    }
}

enum Strategy {
    Overwrite = "Overwrite",
    Skip = "Skip",
    Fail = "Fail",
    ErrorRecovery = "Error recovery",
}
