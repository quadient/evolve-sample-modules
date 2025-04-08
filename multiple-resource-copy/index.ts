export function getDescription() {
    return {
        displayName: "Multiple Resource Copy",
        description: "Copies multiple resources into a target directory. It has no size limit; the amount of transferred data is only limited by the step timeout.",
        category: "Utilities",
        input: [
            {
                id: "source",
                displayName: "Source directory",
                description: "Directory the files will be copied from.",
                type: "InputResource",
                required: true,
            },
            {
                id: "mask",
                displayName: "Mask",
                description:
                    "If specified, the module will copy only files with the defined name. You can use masking characters. Asterisk (*) substitutes any number of arbitrary characters (including no additional characters being present). Question mark substitutes only one arbitrary character.",
                type: "String",
                required: false,
            },
            {
                id: "target",
                displayName: "Target directory",
                description: "Directory the files will be copied to.",
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
                    `${Strategy.Fail} - Ends the processing of the pipeline, i.e. the run ends in the Failed state. ` +
                    `${Strategy.ErrorRecovery} - Does not overwrite the existing resource; writes the file path to the Recovery log (if specified) and sets the step's result to the Partially finished state. Note that if no existing file is found, the resulting state of the step will be Finished and no recovery log file will be created.`,
                type: "Selection",
                options: Object.values(Strategy),
                defaultValue: Strategy.Overwrite,
                required: false,
            },
            {
                id: "recoveryFile",
                displayName: "Recovery log",
                description: `Path to a file that will contain a list of file paths that were not copied because the given resource already exists when the ${Strategy.ErrorRecovery} strategy is used.`,
                type: "OutputResource",
                required: false,
            },
            {
                id: "noFilesFoundStrategy",
                displayName: "If no files found",
                description:
                    "Specifies the module behavior if no files are found in the target folder. " +
                    `If ${NoFilesFoundStrategy.Pass} is selected, the module is processed as normal. ` +
                    `If ${NoFilesFoundStrategy.Fail} is selected, the module processing ends with an error.`,
                type: "Selection",
                options: Object.values(NoFilesFoundStrategy),
                defaultValue: "Pass",
                required: false,
            },
        ],
        output: [
            {
                id: "totalFiles",
                type: "Number",
                displayName: "Total files",
                description: "Total number of processed files.",
            },
            {
                id: "copiedFiles",
                type: "Number",
                displayName: "Copied files",
                description: "Number of successfully copied files.",
            },
            {
                id: "filesWithError",
                type: "Number",
                displayName: "Files with error",
                description: "Number of files that failed to be copied.",
            },
        ],
    } as const satisfies ScriptDescription;
}

export async function execute(context: Context): Promise<Output | void> {
    const parameters = new Parameters(context);
    const recordsPathWriter = new RecordsPathWriter(parameters.strategy, parameters.recoveryFilePath, context);

    console.log(
        `Starting to copy the resources from '${parameters.sourceDirectoryPath}' (source directory) to '${parameters.targetDirectoryPath}' (target directory) ` +
            `using the '${parameters.strategy}' strategy, ` +
            `the '${parameters.mask ?? ""}' mask ` +
            `and the '${parameters.failIfNoFilesFound ? NoFilesFoundStrategy.Fail : NoFilesFoundStrategy.Pass}' strategy if no files found.`,
    );

    const sourceDirectory = context.getDirectory(parameters.sourceDirectoryPath);
    const targetDirectory = context.getDirectory(parameters.targetDirectoryPath);
    const regex = FileMask.createRegExp(parameters.mask);

    if (!(await sourceDirectory.exists())) {
        console.warn(`Source directory '${parameters.sourceDirectoryPath}' does not exist.`);
        return;
    }

    let copiedCount = 0;
    let errorCount = 0;
    try {
        for await (const currentFileLocation of sourceDirectory.list()) {
            if (currentFileLocation.getLocationType() === "File") {
                const sourceName = currentFileLocation.getName();
                if (regex === undefined || regex.test(sourceName)) {
                    const targetFile = targetDirectory.getFile(sourceName);

                    increaseProcessedRecords();

                    if (!(await canCopyFile(parameters.strategy, targetFile))) {
                        await recordsPathWriter.handleErrorRecovery(targetFile.getPath());
                        continue;
                    }

                    try {
                        await currentFileLocation.copyTo(targetFile);
                        console.debug(`File '${targetFile.getName()}' copied successfully.`);
                        copiedCount += 1;
                    } catch (error: any) {
                        console.debug(`Unable to copy '${targetFile.getName()}' due to '${error}'.`);
                        await targetFile.delete();
                        errorCount += 1;
                    }
                }
            }
        }
    } finally {
        await recordsPathWriter.close();
    }

    const totalFiles = copiedCount + errorCount;
    console.log(`Copying of files finished. Successfully copied ${copiedCount} out of ${totalFiles} file(s).`);

    if (parameters.failIfNoFilesFound && totalFiles === 0) {
        throw new Error("No files found in the source directory.");
    }

    return {
        totalFiles: totalFiles,
        copiedFiles: copiedCount,
        filesWithError: errorCount,
    };
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

enum NoFilesFoundStrategy {
    Pass = "Pass",
    Fail = "Fail",
}

enum Strategy {
    Overwrite = "Overwrite",
    Skip = "Skip",
    Fail = "Fail",
    ErrorRecovery = "Error recovery",
}

class Parameters {
    public sourceDirectoryPath: string;
    public targetDirectoryPath: string;
    public mask: string;
    public strategy: string;
    public recoveryFilePath: string;
    public failIfNoFilesFound: boolean;

    constructor(context: Context) {
        this.sourceDirectoryPath = context.parameters.source as string;
        this.targetDirectoryPath = context.parameters.target as string;
        this.mask = context.parameters.mask as string;
        this.strategy = context.parameters.strategy as string;
        this.recoveryFilePath = context.parameters.recoveryFile as string;
        this.failIfNoFilesFound = context.parameters.noFilesFoundStrategy === NoFilesFoundStrategy.Fail;
    }
}

class RecordsPathWriter {
    private _strategy: string;
    private _recordsRecoveryPath: string;
    private _context: Context;
    private _fileStream: WritableStreamDefaultWriter<string> | undefined;

    constructor(strategy: string, recordsRecoveryPath: string, context: Context) {
        this._strategy = strategy;
        this._recordsRecoveryPath = recordsRecoveryPath;
        this._context = context;
        this._fileStream = undefined;
    }

    async handleErrorRecovery(targetPath: string): Promise<void> {
        if (this._strategy !== Strategy.ErrorRecovery) {
            return;
        }

        increaseSkippedRecords();

        if (!this._recordsRecoveryPath) {
            return;
        }

        await this.write(targetPath + "\n");
    }

    private async write(content: string): Promise<void> {
        if (!this._fileStream) {
            const stream = await this._context.openWriteText(this._recordsRecoveryPath);
            this._fileStream = stream.getWriter();
        }

        await this._fileStream.write(content);
    }

    async close() {
        if (this._fileStream) {
            await this._fileStream.close();
        }
    }
}

class FileMask {
    static createRegExp(mask: string, addStartAnchor: boolean = true, addEndAnchor: boolean = true): RegExp | undefined {
        if (!mask) {
            return undefined;
        }

        const regex = (addStartAnchor ? "^" : "") + this.convertMaskToRegex(mask) + (addEndAnchor ? "$" : "");
        return new RegExp(regex);
    }

    private static convertMaskToRegex(mask: string): string {
        if (mask) {
            mask = mask.replaceAll(".", "\\.");
            mask = mask.replaceAll("*", ".*");
            mask = mask.replaceAll("?", ".");
        }
        return mask;
    }
}
