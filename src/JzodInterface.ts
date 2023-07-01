import { ZodType, ZodTypeAny, z } from "zod";


export type ResTypeForTs = {schemas:{[k:string]:ZodType}, references:{[k:string]:ZodType}};
export interface ZodSchemaAndDescription {zodSchema:ZodTypeAny, description:string};

export type JzodToZodResult = {[k:string]:ZodSchemaAndDescription};

export const jzodRootSchema = z.object({
  optional: z.boolean().optional(),
});
export type JzodRoot = z.infer<typeof jzodRootSchema>;

// ##############################################################################################################
export interface JzodSimpleAttribute extends JzodRoot {
  type: "simpleType",
  definition: 'any' | 'boolean' | 'string' | 'number'
}

export const jzodSimpleAttributeSchema: z.ZodType<JzodSimpleAttribute> = z.object({
  optional: z.boolean().optional(),
  type: z.literal('simpleType'),
  definition: z.enum([
    'any',
    'boolean',
    'string',
    'number',
  ])
})

// ##############################################################################################################
export const jzodEnumSchema = z.object({
  type: z.literal("enum"),
  definition: z.array(z.string()),
})

export type JzodEnum = z.infer<typeof jzodEnumSchema>;

// ##############################################################################################################
export const JzodLiteralSchema = z.object({
  type: z.literal("literal"),
  definition: z.string(),
})

export type JzodLiteral = z.infer<typeof JzodLiteralSchema>;

// ##############################################################################################################
export interface JzodFunction {
  type: "function",
  args: JzodSimpleAttribute[],
  returns?: JzodSimpleAttribute,
}

export const jzodFunctionSchema = z.object({
  type: z.literal("function"),
  // anyway, arg and returns types are not use upon validation to check the function's interface. Suffices for it to be a function, it is then valid.
  args:z.array(jzodSimpleAttributeSchema),
  returns: jzodSimpleAttributeSchema.optional(),
})

// ##############################################################################################################
export const jzodLazySchema = z.object({
  type: z.literal("lazy"),
  definition: jzodFunctionSchema,
})

export type JzodLazy = z.infer<typeof jzodLazySchema>;

// ##############################################################################################################
export const jzodReferentialCoreElementSchema = z.object({ // inheritance from ZodRootSchema leads to a different JsonSchema thus invalidates tests, although it is semantically equivalent
  optional: z.boolean().optional(),
  type: z.literal("schemaReference"),
  definition: z.string()
})

export type JzodReferentialCoreElement = z.infer<typeof jzodReferentialCoreElementSchema>;

// ##############################################################################################################
export interface JzodRecord {
  type: 'record',
  // definition: ZodSimpleElement[],
  definition: JzodReferentialElement,
}

export const jzodRecordSchema: z.ZodType<JzodRecord> = z.object({
  type: z.literal('record'),
  definition: z.lazy(()=>jzodReferentialElementSchema)
})

// ##############################################################################################################
export type JzodReferentialElement =
| JzodArray
| JzodEnum
| JzodFunction
| JzodLazy
| JzodLiteral
| JzodSimpleAttribute
| JzodRecord
| JzodObject
| JzodReferentialCoreElement
| JzodUnion
;

export const jzodReferentialElementSchema: z.ZodType<JzodReferentialElement> = z.union([
  z.lazy(()=>jzodReferentialElementArraySchema),
  z.lazy(()=>jzodEnumSchema),
  z.lazy(()=>jzodFunctionSchema),
  z.lazy(()=>jzodLazySchema),
  z.lazy(()=>JzodLiteralSchema),
  z.lazy(()=>jzodObject),
  z.lazy(()=>jzodRecordSchema),
  z.lazy(()=>jzodReferentialCoreElementSchema),
  z.lazy(()=>jzodSimpleAttributeSchema),
  z.lazy(()=>jzodUnionSchema),
])

// ##############################################################################################################
export const jzodReferentialElementSetSchema = z.record(z.string(),jzodReferentialElementSchema);
export type JzodElementSet = z.infer<typeof jzodReferentialElementSetSchema>;


  // ##############################################################################################################
export interface JzodUnion {
  type: "union",
  definition: JzodReferentialElement[],
}
export const jzodUnionSchema: z.ZodType<JzodUnion> = z.object({
  type: z.literal("union"),
  definition: z.lazy(()=>z.array(jzodReferentialElementSchema))
});

// ##############################################################################################################
export interface JzodObject extends JzodRoot {
  type: 'object',
  definition: {[attributeName:string]: JzodReferentialElement}
}

export const jzodObject: z.ZodType<JzodObject> = z.object({
  optional: z.boolean().optional(),
  type: z.literal('object'),
  definition: z.lazy(()=>z.record(z.string(),jzodReferentialElementSchema)),
})

// ##############################################################################################################
export interface JzodArray extends JzodRoot {
  type: 'array',
  definition: JzodReferentialElement
}
export const jzodReferentialElementArraySchema: z.ZodType<JzodArray> = z.object({ // issue with JsonSchema conversion when using extend from ZodRootSchema, although the 2 are functionnaly equivalent
  optional: z.boolean().optional(),
  type: z.literal('array'),
  definition: z.lazy(()=>jzodReferentialElementSchema)
})

// ##############################################################################################################

export const jzodBootstrapSchema: JzodElementSet = {
  ZodArraySchema: {
    type: "object",
    definition: {
      "optional": { type: "simpleType", definition: "boolean", optional: true },
      "type": { type: "literal", definition: "array" },
      "definition": { type: "schemaReference", definition: "ZodReferentialElementSchema" },
    },
  },
  ZodEnumSchema: {
    type: "object",
    definition: {
      "type": { type: "literal", definition: "enum" },
      "definition": { type: "array", definition: { type: "simpleType", definition: "string" } },
    },
  },
  ZodFunctionSchema: {
    type: "object",
    definition: {
      type: { type: "literal", definition: "function" },
      args: {
        type: "array",
        definition: { type: "schemaReference", definition: "ZodSimpleAttributeSchema" },
      },
      returns: { type: "schemaReference", definition: "ZodSimpleAttributeSchema", optional: true },
    },
  },
  ZodLazySchema: {
    type: "object",
    definition: {
      type: { type: "literal", definition: "lazy" },
      definition: { type: "schemaReference", definition: "ZodFunctionSchema" },
    },
  },
  ZodLiteralSchema: {
    type: "object",
    definition: {
      "type": { type: "literal", definition: "literal" },
      "definition": { type: "simpleType", definition: "string" },
    },
  },
  ZodObjectSchema: {
    type: "object",
    definition: {
      "optional": { type: "simpleType", definition: "boolean", optional: true },
      "type": { type: "literal", definition: "object" },
      "definition": {
        type: "record",
        definition: { type: "schemaReference", definition:"ZodReferentialElementSchema" },
      },
    },
  },
  ZodRecordSchema: {
    type: "object",
    definition: {
      type: { type: "literal", definition: "record" },
      definition: { type: "schemaReference", definition: "ZodReferentialElementSchema" },
    },
  },
  ZodReferentialCoreElementSchema: {
    type: "object",
    definition: {
      "optional": { type: "simpleType", definition: "boolean", optional: true },
      "type": { type: "literal", definition: "schemaReference" },
      "definition": { type: "simpleType", definition: "string" },
    },
  },
  ZodReferentialElementSchema: {
    type: "union",
    definition: [
      { type: "schemaReference", definition: "ZodArraySchema"},
      { type: "schemaReference", definition: "ZodEnumSchema"},
      { type: "schemaReference", definition: "ZodFunctionSchema"},
      { type: "schemaReference", definition: "ZodLazySchema"},
      { type: "schemaReference", definition: "ZodLiteralSchema"},
      { type: "schemaReference", definition: "ZodObjectSchema"},
      { type: "schemaReference", definition: "ZodRecordSchema"},
      { type: "schemaReference", definition: "ZodReferentialCoreElementSchema"},
      { type: "schemaReference", definition: "ZodSimpleAttributeSchema"},
      { type: "schemaReference", definition: "ZodUnionSchema"},
    ]
  },
  ZodReferentialElementSetSchema: {
    type: "record",
    definition: { type: "schemaReference", definition:"ZodReferentialElementSchema" },
  },
  ZodSimpleAttributeSchema: {
    type: "object",
    definition: {
      "optional": { type: "simpleType", definition: "boolean", optional: true },
      "type": { type: "literal", definition: "simpleType" },
      "definition": { type: "enum", definition: ['any','boolean','string','number',] },
    },
  },
  ZodUnionSchema: {
    type: "object",
    definition: {
      "type": { type: "literal", definition: "union" },
      "definition": {
        type: "array",
        definition: { type: "schemaReference", definition: "ZodReferentialElementSchema" },
      },
    },
  },
};
