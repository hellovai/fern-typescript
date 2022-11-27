import { AliasTypeDeclaration } from "@fern-fern/ir-model/types";
import { AbstractGeneratedSchema } from "@fern-typescript/abstract-schema-generator";
import { getTextOfTsNode } from "@fern-typescript/commons";
import { Zurg } from "@fern-typescript/commons-v2";
import { GeneratedAliasTypeSchema, TypeSchemaContext } from "@fern-typescript/sdk-declaration-handler";
import { ModuleDeclaration, ts } from "ts-morph";
import { AbstractGeneratedTypeSchema } from "../AbstractGeneratedTypeSchema";

export class GeneratedAliasTypeSchemaImpl
    extends AbstractGeneratedTypeSchema<AliasTypeDeclaration>
    implements GeneratedAliasTypeSchema
{
    public readonly type = "alias";

    protected override getSchema(context: TypeSchemaContext): Zurg.Schema {
        const schemaOfAlias = context.getSchemaOfTypeReference(this.shape.aliasOf);
        const generatedAliasType = context.getTypeBeingGenerated();
        if (generatedAliasType.type !== "alias") {
            throw new Error("Type is not an alias: " + this.typeName);
        }
        if (!generatedAliasType.isBranded) {
            return schemaOfAlias;
        }

        const VALUE_PARAMETER_NAME = "value";
        return schemaOfAlias.transform({
            newShape: undefined,
            parse: generatedAliasType.getReferenceToCreator(context),
            json: ts.factory.createArrowFunction(
                undefined,
                undefined,
                [
                    ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        undefined,
                        VALUE_PARAMETER_NAME,
                        undefined,
                        undefined
                    ),
                ],
                undefined,
                undefined,
                ts.factory.createIdentifier(VALUE_PARAMETER_NAME)
            ),
        });
    }

    protected override generateRawTypeDeclaration(context: TypeSchemaContext, module: ModuleDeclaration): void {
        module.addTypeAlias({
            name: AbstractGeneratedSchema.RAW_TYPE_NAME,
            type: getTextOfTsNode(context.getReferenceToRawType(this.shape.aliasOf).typeNode),
        });
    }
}