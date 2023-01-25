import { FernFilepath, Name } from "@fern-fern/ir-model/commons";
import { ImportsManager, Reference } from "@fern-typescript/commons";
import { EndpointErrorUnionContextMixin, GeneratedEndpointErrorUnion } from "@fern-typescript/contexts";
import { EndpointErrorUnionGenerator } from "@fern-typescript/endpoint-error-union-generator";
import { ServiceResolver } from "@fern-typescript/resolvers";
import { SourceFile } from "ts-morph";
import { EndpointDeclarationReferencer } from "../../declaration-referencers/EndpointDeclarationReferencer";

export declare namespace EndpointErrorUnionContextMixinImpl {
    export interface Init {
        sourceFile: SourceFile;
        importsManager: ImportsManager;
        endpointDeclarationReferencer: EndpointDeclarationReferencer;
        endpointErrorUnionGenerator: EndpointErrorUnionGenerator;
        serviceResolver: ServiceResolver;
    }
}

export class EndpointErrorUnionContextMixinImpl implements EndpointErrorUnionContextMixin {
    private sourceFile: SourceFile;
    private importsManager: ImportsManager;
    private endpointDeclarationReferencer: EndpointDeclarationReferencer;
    private endpointErrorUnionGenerator: EndpointErrorUnionGenerator;
    private serviceResolver: ServiceResolver;

    constructor({
        sourceFile,
        importsManager,
        endpointDeclarationReferencer,
        endpointErrorUnionGenerator,
        serviceResolver,
    }: EndpointErrorUnionContextMixinImpl.Init) {
        this.sourceFile = sourceFile;
        this.importsManager = importsManager;
        this.endpointDeclarationReferencer = endpointDeclarationReferencer;
        this.endpointErrorUnionGenerator = endpointErrorUnionGenerator;
        this.serviceResolver = serviceResolver;
    }

    public getGeneratedEndpointErrorUnion(service: FernFilepath, endpointName: Name): GeneratedEndpointErrorUnion {
        const serviceDeclaration = this.serviceResolver.getServiceDeclarationFromName(service);
        if (serviceDeclaration.originalService == null) {
            throw new Error("Service is a wrapper");
        }
        const endpoint = serviceDeclaration.originalService.endpoints.find(
            (endpoint) => endpoint.name.originalName === endpointName.originalName
        );
        if (endpoint == null) {
            throw new Error(`Endpoint ${endpointName.originalName} does not exist`);
        }
        return this.endpointErrorUnionGenerator.generateEndpointErrorUnion({
            service: serviceDeclaration.originalService,
            endpoint,
        });
    }

    public getReferenceToEndpointTypeExport(
        service: FernFilepath,
        endpointName: Name,
        export_: string | string[]
    ): Reference {
        const serviceDeclaration = this.serviceResolver.getServiceDeclarationFromName(service);
        if (serviceDeclaration.originalService == null) {
            throw new Error("Service is a wrapper");
        }
        const endpoint = serviceDeclaration.originalService.endpoints.find(
            (endpoint) => endpoint.name.originalName === endpointName.originalName
        );
        if (endpoint == null) {
            throw new Error(`Endpoint ${endpointName.originalName} does not exist`);
        }
        return this.endpointDeclarationReferencer.getReferenceToEndpointExport({
            name: { service, endpoint },
            referencedIn: this.sourceFile,
            importsManager: this.importsManager,
            importStrategy: { type: "fromRoot" },
            subImport: typeof export_ === "string" ? [export_] : export_,
        });
    }
}