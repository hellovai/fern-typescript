import { MapType, TypeReference } from "@fern-fern/ir-model/types";
import { TypeReferenceNode } from "@fern-typescript/commons";
import { ts } from "ts-morph";
import { AbstractTypeReferenceToTypeNodeConverter } from "./AbstractTypeReferenceToTypeNodeConverter";

export class TypeReferenceToRawTypeNodeConverter extends AbstractTypeReferenceToTypeNodeConverter {
    protected override mapWithEnumKeys(map: MapType): TypeReferenceNode {
        const valueType = this.convert(map.valueType);
        return this.generateNonOptionalTypeReferenceNode(
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("Record"), [
                this.convert(map.keyType).typeNode,
                (valueType.isOptional ? valueType : this.optional(map.valueType)).typeNode,
            ])
        );
    }

    protected override mapWithNonEnumKeys(map: MapType): TypeReferenceNode {
        return this.generateNonOptionalTypeReferenceNode(
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("Record"), [
                this.convert(map.keyType).typeNode,
                this.convert(map.valueType).typeNode,
            ])
        );
    }

    protected override set(itemType: TypeReference): TypeReferenceNode {
        return this.generateNonOptionalTypeReferenceNode(
            ts.factory.createArrayTypeNode(this.convert(itemType).typeNode)
        );
    }

    protected override optional(itemType: TypeReference): TypeReferenceNode {
        const referencedToValueType = this.convert(itemType).typeNode;
        return {
            isOptional: true,
            typeNode: ts.factory.createUnionTypeNode([
                referencedToValueType,
                ts.factory.createLiteralTypeNode(ts.factory.createNull()),
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            ]),
            typeNodeWithoutUndefined: ts.factory.createUnionTypeNode([
                referencedToValueType,
                ts.factory.createLiteralTypeNode(ts.factory.createNull()),
            ]),
        };
    }

    protected override dateTime(): TypeReferenceNode {
        return this.string();
    }
}