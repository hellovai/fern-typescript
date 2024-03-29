import { DeclaredErrorName, ErrorDeclaration } from "@fern-fern/ir-model/errors";
import { ImportsManager, Reference } from "@fern-typescript/commons";
import { ExpressErrorContextMixin, GeneratedExpressError } from "@fern-typescript/contexts";
import { ExpressErrorGenerator } from "@fern-typescript/express-error-generator";
import { ErrorResolver } from "@fern-typescript/resolvers";
import { SourceFile } from "ts-morph";
import { ExpressErrorDeclarationReferencer } from "../../declaration-referencers/ExpressErrorDeclarationReferencer";

export declare namespace ExpressErrorContextMixinImpl {
    export interface Init {
        sourceFile: SourceFile;
        importsManager: ImportsManager;
        errorDeclarationReferencer: ExpressErrorDeclarationReferencer;
        expressErrorGenerator: ExpressErrorGenerator;
        errorResolver: ErrorResolver;
    }
}

export class ExpressErrorContextMixinImpl implements ExpressErrorContextMixin {
    private sourceFile: SourceFile;
    private importsManager: ImportsManager;
    private errorDeclarationReferencer: ExpressErrorDeclarationReferencer;
    private expressErrorGenerator: ExpressErrorGenerator;
    private errorResolver: ErrorResolver;

    constructor({
        sourceFile,
        importsManager,
        errorDeclarationReferencer,
        expressErrorGenerator,
        errorResolver,
    }: ExpressErrorContextMixinImpl.Init) {
        this.sourceFile = sourceFile;
        this.importsManager = importsManager;
        this.errorDeclarationReferencer = errorDeclarationReferencer;
        this.expressErrorGenerator = expressErrorGenerator;
        this.errorResolver = errorResolver;
    }

    public getReferenceToError(errorName: DeclaredErrorName): Reference {
        return this.errorDeclarationReferencer.getReferenceToError({
            name: errorName,
            importStrategy: { type: "fromRoot" },
            referencedIn: this.sourceFile,
            importsManager: this.importsManager,
        });
    }

    public getGeneratedExpressError(errorName: DeclaredErrorName): GeneratedExpressError {
        return this.expressErrorGenerator.generateError({
            errorName: this.getErrorClassName(errorName),
            errorDeclaration: this.getErrorDeclaration(errorName),
        });
    }

    public getErrorDeclaration(errorName: DeclaredErrorName): ErrorDeclaration {
        return this.errorResolver.getErrorDeclarationFromName(errorName);
    }

    public getErrorClassName(errorName: DeclaredErrorName): string {
        return this.errorDeclarationReferencer.getExportedName(errorName);
    }
}
