import { getRelativePathAsModuleSpecifierTo } from "@fern-typescript/commons";
import { Reference } from "@fern-typescript/sdk-declaration-handler";
import { SourceFile, ts } from "ts-morph";
import { convertExportedFilePathToFilePath, ExportedFilePath } from "../../exports-manager/ExportedFilePath";
import { ImportDeclaration } from "../../imports-manager/ImportsManager";
import { ModuleSpecifier } from "../../utils/ModuleSpecifier";

export function getDirectReferenceToExport({
    exportedName,
    exportedFromPath,
    addImport,
    referencedIn,
    importAlias,
    subImport = [],
}: {
    exportedName: string;
    exportedFromPath: ExportedFilePath;
    addImport: (moduleSpecifier: ModuleSpecifier, importDeclaration: ImportDeclaration) => void;
    referencedIn: SourceFile;
    importAlias: string | undefined;
    subImport?: string[];
}): Reference {
    const moduleSpecifier = getRelativePathAsModuleSpecifierTo(
        referencedIn,
        convertExportedFilePathToFilePath(exportedFromPath)
    );

    addImport(moduleSpecifier, {
        namedImports: [
            {
                name: exportedName,
                alias: importAlias,
            },
        ],
    });

    const importedName = importAlias ?? exportedName;

    const entityName = subImport.reduce<ts.EntityName>(
        (acc, subImport) => ts.factory.createQualifiedName(acc, subImport),
        ts.factory.createIdentifier(importedName)
    );
    return {
        typeNode: ts.factory.createTypeReferenceNode(entityName),
        entityName,
        expression: ts.factory.createIdentifier(importedName),
    };
}