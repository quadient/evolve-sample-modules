export function getDescription() {
    return {
        description: "Xslt Transformation",
        input: [
            {
                id: "template",
                displayName: "XSLT Template",
                description: "Path to the XSLT template file.",
                type: "InputResource",
                required: true,
            },
            {
                id: "xml",
                displayName: "XML File",
                description: "Path to the XML file.",
                type: "InputResource",
                required: true,
            },
            {
                id: "result",
                displayName: "Result File",
                description: "Path to the result file.",
                type: "OutputResource",
                required: true,
            },
        ],
        output: [],
    } as const satisfies ScriptDescription;
}

export async function execute(context: Context): Promise<Output> {
    const templatePath = context.parameters.template as string;
    const xmlPath = context.parameters.xml as string;
    const resultPath = context.parameters.result as string;

    console.log(`Reading XSLT template from: ${templatePath}`);
    const templateFile = context.getFile(templatePath);
    const templateContent = await templateFile.read();

    console.log(`Reading XML file from: ${xmlPath}`);
    const xmlFile = context.getFile(xmlPath);
    const xmlContent = await xmlFile.read();

    console.log("Applying XSLT transformation.");
    const transformedContent = runtime.xmlUtils.applyTemplate(xmlContent, templateContent);

    console.log(`Writing result to: ${resultPath}`);
    const resultFile = context.getFile(resultPath);
    await resultFile.write(transformedContent);

    console.log("Transformation completed successfully.");
}
