import {
    HttpEndpoint,
    HttpPath,
    HttpRequestBody,
    HttpService,
    PathParameter,
    SdkRequestShape,
} from "@fern-fern/ir-model/http";
import { Fetcher, getTextOfTsNode } from "@fern-typescript/commons";
import { GeneratedSdkEndpointTypeSchemas, SdkClientClassContext } from "@fern-typescript/contexts";
import {
    MethodDeclarationStructure,
    OptionalKind,
    ParameterDeclarationStructure,
    Scope,
    StatementStructures,
    StructureKind,
    ts,
    VariableDeclarationKind,
    WriterFunction,
} from "ts-morph";
import urlJoin from "url-join";
import { GeneratedEndpointImplementation } from "./GeneratedEndpointImplementation";
import { GeneratedHeader } from "./GeneratedHeader";
import { GeneratedSdkClientClassImpl } from "./GeneratedSdkClientClassImpl";
import { RequestBodyParameter } from "./request-parameter/RequestBodyParameter";
import { RequestParameter } from "./request-parameter/RequestParameter";
import { RequestWrapperParameter } from "./request-parameter/RequestWrapperParameter";

export declare namespace AbstractGeneratedEndpointImplementation {
    export interface Init {
        service: HttpService;
        endpoint: HttpEndpoint;
        generatedSdkClientClass: GeneratedSdkClientClassImpl;
        includeCredentialsOnCrossOriginRequests: boolean;
    }
}

export abstract class AbstractGeneratedEndpointImplementation implements GeneratedEndpointImplementation {
    // these start with an underscore to prevent collisions with path parameters
    protected static RESPONSE_VARIABLE_NAME = "_response";
    protected static QUERY_PARAMS_VARIABLE_NAME = "_queryParams";

    protected service: HttpService;
    protected endpoint: HttpEndpoint;
    private generatedSdkClientClass: GeneratedSdkClientClassImpl;
    private requestParameter: RequestParameter | undefined;
    private includeCredentialsOnCrossOriginRequests: boolean;

    constructor({
        service,
        endpoint,
        generatedSdkClientClass,
        includeCredentialsOnCrossOriginRequests,
    }: AbstractGeneratedEndpointImplementation.Init) {
        this.service = service;
        this.endpoint = endpoint;
        this.generatedSdkClientClass = generatedSdkClientClass;
        this.includeCredentialsOnCrossOriginRequests = includeCredentialsOnCrossOriginRequests;

        const sdkRequest = this.endpoint.sdkRequest;
        this.requestParameter =
            sdkRequest != null
                ? SdkRequestShape._visit<RequestParameter>(sdkRequest.shape, {
                      justRequestBody: (requestBodyReference) =>
                          new RequestBodyParameter({ requestBodyReference, service, endpoint, sdkRequest }),
                      wrapper: () => new RequestWrapperParameter({ service, endpoint, sdkRequest }),
                      _unknown: () => {
                          throw new Error("Unknown SdkRequest: " + this.endpoint.sdkRequest?.shape.type);
                      },
                  })
                : undefined;
    }

    public getImplementation(context: SdkClientClassContext): OptionalKind<MethodDeclarationStructure> {
        return {
            name: this.endpoint.name.camelCase.unsafeName,
            parameters: this.getEndpointParameters(context),
            returnType: getTextOfTsNode(ts.factory.createTypeReferenceNode("Promise", [this.getResponseType(context)])),
            scope: Scope.Public,
            isAsync: true,
            statements: this.generateMethodBody(context),
        };
    }

    public getDocs(context: SdkClientClassContext): string | undefined {
        const parts: string[] = [];

        if (this.endpoint.docs != null) {
            parts.push(this.endpoint.docs);
        }
        parts.push(...this.getAdditionalDocLines(context));

        if (parts.length === 0) {
            return undefined;
        }

        return parts.join("\n");
    }

    protected abstract getAdditionalDocLines(context: SdkClientClassContext): string[];

    private getEndpointParameters(context: SdkClientClassContext): OptionalKind<ParameterDeclarationStructure>[] {
        const parameters: OptionalKind<ParameterDeclarationStructure>[] = [];
        for (const pathParameter of this.getAllPathParameters()) {
            parameters.push({
                name: this.getParameterNameForPathParameter(pathParameter),
                type: getTextOfTsNode(context.type.getReferenceToType(pathParameter.valueType).typeNode),
            });
        }
        if (this.requestParameter != null) {
            parameters.push(this.requestParameter.getParameterDeclaration(context));
        }
        return parameters;
    }

    private getAllPathParameters(): PathParameter[] {
        return [...this.service.pathParameters, ...this.endpoint.pathParameters];
    }

    private getParameterNameForPathParameter(pathParameter: PathParameter): string {
        return pathParameter.name.camelCase.unsafeName;
    }

    private generateMethodBody(context: SdkClientClassContext): (StatementStructures | WriterFunction | string)[] {
        const statements: (StatementStructures | WriterFunction | string)[] = [];

        let urlSearchParamsVariable: ts.Expression | undefined;
        if (this.requestParameter != null) {
            statements.push(...this.requestParameter.getInitialStatements(context).map(getTextOfTsNode));
            const queryParameters = this.requestParameter.getAllQueryParameters(context);
            if (queryParameters.length > 0) {
                statements.push({
                    kind: StructureKind.VariableStatement,
                    declarationKind: VariableDeclarationKind.Const,
                    declarations: [
                        {
                            name: AbstractGeneratedEndpointImplementation.QUERY_PARAMS_VARIABLE_NAME,
                            initializer: getTextOfTsNode(
                                ts.factory.createNewExpression(
                                    ts.factory.createIdentifier("URLSearchParams"),
                                    undefined,
                                    []
                                )
                            ),
                        },
                    ],
                });
                for (const queryParameter of queryParameters) {
                    statements.push(
                        ...this.requestParameter
                            .withQueryParameter(queryParameter, context, (referenceToQueryParameter) => {
                                return [
                                    ts.factory.createExpressionStatement(
                                        ts.factory.createCallExpression(
                                            ts.factory.createPropertyAccessExpression(
                                                ts.factory.createIdentifier(
                                                    AbstractGeneratedEndpointImplementation.QUERY_PARAMS_VARIABLE_NAME
                                                ),
                                                ts.factory.createIdentifier("append")
                                            ),
                                            undefined,
                                            [
                                                ts.factory.createStringLiteral(queryParameter.name.wireValue),
                                                context.type.stringify(
                                                    referenceToQueryParameter,
                                                    queryParameter.valueType
                                                ),
                                            ]
                                        )
                                    ),
                                ];
                            })
                            .map(getTextOfTsNode)
                    );
                }
                urlSearchParamsVariable = ts.factory.createIdentifier(
                    AbstractGeneratedEndpointImplementation.QUERY_PARAMS_VARIABLE_NAME
                );
            }
        }

        const referenceToEnvironment = this.generatedSdkClientClass.getEnvironment(context);
        const url = this.buildUrl(context);

        const fetcherArgs: Fetcher.Args = {
            url:
                url != null
                    ? context.base.externalDependencies.urlJoin.invoke([referenceToEnvironment, url])
                    : referenceToEnvironment,
            method: ts.factory.createStringLiteral(this.endpoint.method),
            headers: this.getHeadersForFetcherArgs(context),
            queryParameters: urlSearchParamsVariable,
            body: this.getSerializedRequestBody(context),
            timeoutMs: undefined,
            withCredentials: this.includeCredentialsOnCrossOriginRequests,
        };

        statements.push({
            kind: StructureKind.VariableStatement,
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: AbstractGeneratedEndpointImplementation.RESPONSE_VARIABLE_NAME,
                    initializer: getTextOfTsNode(
                        context.base.coreUtilities.fetcher.fetcher._invoke(fetcherArgs, {
                            referenceToFetcher: this.generatedSdkClientClass.getReferenceToFetcher(context),
                        })
                    ),
                },
            ],
        });

        statements.push(...this.getReturnResponseStatements(context).map(getTextOfTsNode));

        return statements;
    }

    private buildUrl(context: SdkClientClassContext): ts.Expression | undefined {
        if (this.service.pathParameters.length === 0 && this.endpoint.pathParameters.length === 0) {
            const joinedUrl = urlJoin(this.service.basePath.head, this.endpoint.path.head);
            if (joinedUrl.length === 0) {
                return undefined;
            }
            return ts.factory.createStringLiteral(joinedUrl);
        }

        const httpPath = this.getHttpPath();

        return ts.factory.createTemplateExpression(
            ts.factory.createTemplateHead(httpPath.head),
            httpPath.parts.map((part, index) => {
                const pathParameter = this.getAllPathParameters().find(
                    (param) => param.name.originalName === part.pathParameter
                );
                if (pathParameter == null) {
                    throw new Error("Could not locate path parameter: " + part.pathParameter);
                }

                let referenceToPathParameterValue: ts.Expression = ts.factory.createIdentifier(
                    this.getParameterNameForPathParameter(pathParameter)
                );
                if (pathParameter.valueType._type === "named") {
                    referenceToPathParameterValue = context.typeSchema
                        .getSchemaOfNamedType(pathParameter.valueType, {
                            isGeneratingSchema: false,
                        })
                        .jsonOrThrow(referenceToPathParameterValue);
                }

                return ts.factory.createTemplateSpan(
                    referenceToPathParameterValue,
                    index === httpPath.parts.length - 1
                        ? ts.factory.createTemplateTail(part.tail)
                        : ts.factory.createTemplateMiddle(part.tail)
                );
            })
        );
    }

    private getHttpPath(): HttpPath {
        const serviceBasePathPartsExceptLast = [...this.service.basePath.parts];
        const lastServiceBasePathPart = serviceBasePathPartsExceptLast.pop();

        if (lastServiceBasePathPart == null) {
            return {
                head: urlJoin(this.service.basePath.head, this.endpoint.path.head),
                parts: this.endpoint.path.parts,
            };
        }

        return {
            head: this.service.basePath.head,
            parts: [
                ...serviceBasePathPartsExceptLast,
                {
                    pathParameter: lastServiceBasePathPart.pathParameter,
                    tail: urlJoin(lastServiceBasePathPart.tail, "/", this.endpoint.path.head),
                },
                ...this.endpoint.path.parts,
            ],
        };
    }

    private getHeadersForFetcherArgs(context: SdkClientClassContext): ts.ObjectLiteralElementLike[] {
        const elements: GeneratedHeader[] = [];
        if (this.requestParameter != null) {
            for (const header of this.requestParameter.getAllHeaders(context)) {
                elements.push({
                    header: header.name.wireValue,
                    value: this.requestParameter.getReferenceToHeader(header, context),
                });
            }
        }
        elements.push(
            ...this.generatedSdkClientClass.getApiHeaders(),
            ...this.generatedSdkClientClass.getAuthorizationHeaders(context)
        );

        return elements.map(({ header, value }) =>
            ts.factory.createPropertyAssignment(ts.factory.createStringLiteral(header), value)
        );
    }

    private getSerializedRequestBody(context: SdkClientClassContext): ts.Expression | undefined {
        if (this.requestParameter == null || this.endpoint.requestBody == null) {
            return undefined;
        }
        const referenceToRequestBody = this.requestParameter.getReferenceToRequestBody(context);
        if (referenceToRequestBody == null) {
            return undefined;
        }

        return HttpRequestBody._visit(this.endpoint.requestBody, {
            inlinedRequestBody: () => {
                return context.sdkInlinedRequestBodySchema
                    .getGeneratedInlinedRequestBodySchema(this.service.name, this.endpoint.name)
                    .serializeRequest(referenceToRequestBody, context);
            },
            reference: () =>
                context.sdkEndpointTypeSchemas
                    .getGeneratedEndpointTypeSchemas(this.service.name, this.endpoint.name)
                    .serializeRequest(referenceToRequestBody, context),
            _unknown: () => {
                throw new Error("Unknown HttpRequestBody type: " + this.endpoint.requestBody?.type);
            },
        });
    }

    protected getGeneratedEndpointTypeSchemas(context: SdkClientClassContext): GeneratedSdkEndpointTypeSchemas {
        return context.sdkEndpointTypeSchemas.getGeneratedEndpointTypeSchemas(this.service.name, this.endpoint.name);
    }

    private getReturnResponseStatements(context: SdkClientClassContext): ts.Statement[] {
        return [this.getReturnResponseIfOk(context), ...this.getReturnFailedResponse(context)];
    }

    private getReturnResponseIfOk(context: SdkClientClassContext): ts.Statement {
        return ts.factory.createIfStatement(
            ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier(AbstractGeneratedEndpointImplementation.RESPONSE_VARIABLE_NAME),
                ts.factory.createIdentifier("ok")
            ),
            ts.factory.createBlock([ts.factory.createReturnStatement(this.getReturnValueForOkResponse(context))], true)
        );
    }

    protected getOkResponseBody(context: SdkClientClassContext): ts.Expression {
        const generatedEndpointTypeSchemas = this.getGeneratedEndpointTypeSchemas(context);
        return generatedEndpointTypeSchemas.deserializeResponse(
            ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier(AbstractGeneratedEndpointImplementation.RESPONSE_VARIABLE_NAME),
                context.base.coreUtilities.fetcher.APIResponse.SuccessfulResponse.body
            ),
            context
        );
    }

    protected getReferenceToError(context: SdkClientClassContext): ts.Expression {
        return ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier(AbstractGeneratedEndpointImplementation.RESPONSE_VARIABLE_NAME),
            context.base.coreUtilities.fetcher.APIResponse.FailedResponse.error
        );
    }

    protected getReferenceToErrorBody(context: SdkClientClassContext): ts.Expression {
        return ts.factory.createPropertyAccessExpression(
            this.getReferenceToError(context),
            context.base.coreUtilities.fetcher.Fetcher.FailedStatusCodeError.body
        );
    }

    protected abstract getResponseType(context: SdkClientClassContext): ts.TypeNode;
    protected abstract getReturnValueForOkResponse(context: SdkClientClassContext): ts.Expression | undefined;
    protected abstract getReturnFailedResponse(context: SdkClientClassContext): ts.Statement[];
}
