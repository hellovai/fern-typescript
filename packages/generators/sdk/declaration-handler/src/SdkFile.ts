import { DeclaredErrorName, ErrorDeclaration } from "@fern-fern/ir-model/errors";
import { FernConstants } from "@fern-fern/ir-model/ir";
import { DeclaredServiceName } from "@fern-fern/ir-model/services/commons";
import { HttpService } from "@fern-fern/ir-model/services/http";
import { ResolvedTypeReference, TypeReference } from "@fern-fern/ir-model/types";
import { WrapperName } from "@fern-typescript/commons-v2";
import { SourceFile } from "ts-morph";
import { ExternalDependencies } from "./external-dependencies/ExternalDependencies";
import { ParsedAuthSchemes } from "./ParsedAuthSchemes";
import { Reference } from "./Reference";
import { TypeReferenceNode } from "./TypeReferenceNode";

export interface SdkFile {
    sourceFile: SourceFile;
    getReferenceToType: (typeReference: TypeReference) => TypeReferenceNode;
    resolveTypeReference: (typeReference: TypeReference) => ResolvedTypeReference;
    getErrorDeclaration: (errorName: DeclaredErrorName) => ErrorDeclaration;
    getReferenceToError: (errorName: DeclaredErrorName) => Reference;
    addDependency: (name: string, version: string, options?: { preferPeer?: boolean }) => void;
    addNamedExport: (namedExport: string) => void;
    getReferenceToExportInSameFile: (exportedName: string) => Reference;
    getServiceDeclaration: (serviceName: DeclaredServiceName) => HttpService;
    getReferenceToService: (serviceName: DeclaredServiceName, options: { importAlias: string }) => Reference;
    getReferenceToWrapper: (wrapperName: WrapperName, options: { importAlias: string }) => Reference;
    externalDependencies: ExternalDependencies;
    authSchemes: ParsedAuthSchemes;
    fernConstants: FernConstants;
}