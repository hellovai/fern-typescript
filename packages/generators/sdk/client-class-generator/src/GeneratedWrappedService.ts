import { FernFilepath } from "@fern-fern/ir-model/commons";
import { getTextOfTsNode, Reference } from "@fern-typescript/commons";
import { SdkClientClassContext } from "@fern-typescript/contexts";
import { ClassDeclaration, Scope, ts } from "ts-morph";
import { GeneratedSdkClientClassImpl } from "./GeneratedSdkClientClassImpl";

export declare namespace GeneratedWrappedService {
    interface Init {
        wrapperService: GeneratedSdkClientClassImpl;
        wrappedService: FernFilepath;
    }
}

export class GeneratedWrappedService {
    private wrapperService: GeneratedSdkClientClassImpl;
    private wrappedService: FernFilepath;

    constructor({ wrapperService, wrappedService }: GeneratedWrappedService.Init) {
        this.wrapperService = wrapperService;
        this.wrappedService = wrappedService;
    }

    public addToServiceClass(class_: ClassDeclaration, context: SdkClientClassContext): void {
        const referenceToWrapped = this.getReferenceToWrappedService(context);
        const generatedWrappedService = context.service.getGeneratedSdkClientClass(this.wrappedService);

        class_.addProperty({
            name: this.getCachedMemberName(),
            type: getTextOfTsNode(
                ts.factory.createUnionTypeNode([
                    referenceToWrapped.getTypeNode(),
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
                ])
            ),
        });

        class_.addGetAccessor({
            name: this.getGetterName(),
            returnType: getTextOfTsNode(referenceToWrapped.getTypeNode()),
            scope: Scope.Public,
            statements: [
                getTextOfTsNode(
                    ts.factory.createReturnStatement(
                        ts.factory.createParenthesizedExpression(
                            ts.factory.createBinaryExpression(
                                ts.factory.createPropertyAccessExpression(
                                    ts.factory.createThis(),
                                    this.getCachedMemberName()
                                ),
                                ts.SyntaxKind.QuestionQuestionEqualsToken,
                                generatedWrappedService.instantiate({
                                    referenceToClient: referenceToWrapped.getExpression(),
                                    referenceToOptions: this.wrapperService.getReferenceToOptions(),
                                })
                            )
                        )
                    )
                ),
            ],
        });
    }

    private getCachedMemberName(): string {
        return `#${this.getGetterName()}`;
    }

    private getGetterName(): string {
        const lastFernFilepathPart = this.wrappedService[this.wrappedService.length - 1];
        if (lastFernFilepathPart == null) {
            throw new Error("Cannot generate wrapped service because FernFilepath is empty");
        }
        return lastFernFilepathPart.camelCase.unsafeName;
    }

    private getImportAlias(): string {
        const lastFernFilepathPart = this.wrappedService[this.wrappedService.length - 1];
        if (lastFernFilepathPart == null) {
            throw new Error("Cannot generate wrapped service because FernFilepath is empty");
        }
        return `${lastFernFilepathPart.pascalCase.unsafeName}Client`;
    }

    private getReferenceToWrappedService(context: SdkClientClassContext): Reference {
        return context.service.getReferenceToService(this.wrappedService, {
            importAlias: this.getImportAlias(),
        });
    }
}