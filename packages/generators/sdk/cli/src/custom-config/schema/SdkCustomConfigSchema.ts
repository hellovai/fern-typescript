import { z } from "zod";

export const SdkCustomConfigSchema = z.strictObject({
    useBrandedStringAliases: z.optional(z.boolean()),
    private: z.optional(z.boolean()),
    neverThrowErrors: z.optional(z.boolean()),
    namespaceExport: z.optional(z.string()),
    outputEsm: z.optional(z.boolean()),
    includeCredentialsOnCrossOriginRequests: z.optional(z.boolean()),
    bundle: z.optional(z.boolean()),
    allowCustomFetcher: z.optional(z.boolean()),
});

export type SdkCustomConfigSchema = z.infer<typeof SdkCustomConfigSchema>;
