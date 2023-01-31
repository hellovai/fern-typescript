import { DependencyType, NpmPackage, PackageDependencies } from "@fern-typescript/commons";
import produce from "immer";
import { Volume } from "memfs/lib/volume";
import { IPackageJson } from "package-json-type";
import {
    API_BUNDLE_FILENAME,
    BROWSER_CJS_DIST_DIRECTORY,
    BROWSER_ESM_DIST_DIRECTORY,
    BUILD_SCRIPT_NAME,
    DIST_DIRECTORY,
    NODE_DIST_DIRECTORY,
    NON_EXPORTED_FOLDERS,
    TYPES_DIRECTORY,
} from "./constants";
import { getAllStubTypeFiles } from "./generateStubTypeDeclarations";
import { getBundleForNonExportedFolder, getPathToProjectFile } from "./utils";

export const PackageJsonScript = {
    COMPILE: "compile",
    BUNDLE: "bundle",
    BUILD: "build",
    FORMAT: "format",
} as const;

export const PRETTIER_COMMAND = ["prettier", "--write", "src/**/*.ts"];

export const DEV_DEPENDENCIES: Record<string, string> = {
    "@types/node": "17.0.33",
    esbuild: "0.16.15",
    prettier: "2.7.1",
    typescript: "4.9.3",
    "tsc-alias": "^1.7.1",
};

export async function generatePackageJson({
    volume,
    dependencies,
    npmPackage,
}: {
    volume: Volume;
    dependencies: PackageDependencies | undefined;
    npmPackage: NpmPackage;
}): Promise<void> {
    let packageJson: IPackageJson = {
        name: npmPackage.packageName,
        version: npmPackage.version,
    };

    packageJson = {
        ...packageJson,
        private: npmPackage.private,
        repository: npmPackage.repoUrl,
        files: ["dist", "types", ...getAllStubTypeFiles()],
        exports: {
            ".": getExportsForBundle(API_BUNDLE_FILENAME, {
                pathToTypesFile: `./${TYPES_DIRECTORY}/index.d.ts`,
            }),
            ...NON_EXPORTED_FOLDERS.reduce(
                (acc, folder) => ({
                    ...acc,
                    [`./${folder}`]: getExportsForBundle(`${getBundleForNonExportedFolder(folder)}`, {
                        pathToTypesFile: `./${TYPES_DIRECTORY}/${folder}/index.d.ts`,
                    }),
                }),
                {}
            ),
        },
        types: `./${TYPES_DIRECTORY}/index.d.ts`,
        scripts: {
            [PackageJsonScript.FORMAT]: PRETTIER_COMMAND.join(" "),
            [PackageJsonScript.COMPILE]: "tsc && tsc-alias",
            [PackageJsonScript.BUNDLE]: `node ${BUILD_SCRIPT_NAME}`,
            [PackageJsonScript.BUILD]: [`yarn ${PackageJsonScript.COMPILE}`, `yarn ${PackageJsonScript.BUNDLE}`].join(
                " && "
            ),
        },
    };

    packageJson = produce(packageJson, (draft) => {
        if (dependencies != null) {
            if (Object.keys(dependencies[DependencyType.PROD]).length > 0) {
                draft.dependencies = dependencies[DependencyType.PROD];
            }
            if (Object.keys(dependencies[DependencyType.PEER]).length > 0) {
                draft.peerDependencies = dependencies[DependencyType.PEER];
            }
        }
        draft.devDependencies = {
            ...dependencies?.[DependencyType.DEV],
            ...DEV_DEPENDENCIES,
        };
    });

    await volume.promises.writeFile(getPathToProjectFile("package.json"), JSON.stringify(packageJson, undefined, 4));
}

function getExportsForBundle(bundleFilename: string, { pathToTypesFile }: { pathToTypesFile: string }) {
    return {
        node: getPathToNodeDistFile(bundleFilename),
        import: getPathToBrowserEsmDistFile(bundleFilename),
        require: getPathToBrowserCjsDistFile(bundleFilename),
        default: getPathToBrowserCjsDistFile(bundleFilename),
        types: pathToTypesFile,
    };
}

function getPathToNodeDistFile(filename: string) {
    return getPathToDistFile({ outdir: NODE_DIST_DIRECTORY, filename });
}

function getPathToBrowserEsmDistFile(filename: string) {
    return getPathToDistFile({ outdir: BROWSER_ESM_DIST_DIRECTORY, filename });
}

function getPathToBrowserCjsDistFile(filename: string) {
    return getPathToDistFile({ outdir: BROWSER_CJS_DIST_DIRECTORY, filename });
}

function getPathToDistFile({ outdir, filename }: { outdir: string; filename: string }) {
    return `./${DIST_DIRECTORY}/${outdir}/${filename}`;
}
