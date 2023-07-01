import { optional, z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import {
  JzodToZodResult,
  JzodReferentialElement,
  JzodElementSet,
  ZodSchemaAndDescription,
  JzodUnion,
} from "./JzodInterface";

export function getDescriptions(set:JzodToZodResult) {
 return  Object.fromEntries(Object.entries(set).map(a=>[a[0],a[1].description]))
}

// ######################################################################################################
export function jzodSchemaSetToZodSchemaSet(elementSet:JzodElementSet,generateForTs?: boolean):JzodToZodResult {
  let result:JzodToZodResult = {}
  
  for (const entry of Object.entries(elementSet)) {
    result[entry[0]] = jzodSchemaToZodSchema(entry[0],entry[1],()=>result,generateForTs)
  }
  console.log('getZodSchemaFromJsonZodSchemaSet done', Object.keys(result))
  return result;
}


// ######################################################################################################
export function jzodSchemaToZodSchema(name:string, element:JzodReferentialElement,getSchemaReferences:()=>JzodToZodResult,generateForTs?: boolean):ZodSchemaAndDescription {
  switch (element.type) {
    case "literal": {
      return {
        zodSchema:z.literal(element.definition),
        description: `z.literal(${element.definition})`
      }
    }
    case "lazy": {
      const sub = jzodSchemaToZodSchema(name, element.definition,getSchemaReferences,generateForTs);
      return {
        zodSchema:z.lazy(()=>sub.zodSchema),
        description:`z.lazy(()=>${sub.description}),`
      }
    }
    case "function": {
      const args = Object.entries(element.args).map(e=>jzodSchemaToZodSchema(name, e[1],getSchemaReferences,generateForTs));
      if (element.returns) {
        const returns = jzodSchemaToZodSchema(name, element.returns,getSchemaReferences,generateForTs);
        return {
          zodSchema:z.function().args(...args.map(z=>z.zodSchema) as any).returns(returns.zodSchema),
          description:`z.function().args(${JSON.stringify(args.map(z=>z.description))}).returns(${returns.description})`
        };

      } else {
        return {
          zodSchema:z.function().args(...args.map(z=>z.zodSchema) as any),
          description:`z.function().args(${JSON.stringify(args.map(z=>z.description))})`
        };
      }
    }
    case "enum": {
      if (Array.isArray(element.definition) && element.definition.length > 1) {
        return {
          zodSchema:z.enum([...element.definition] as any),
          description:`z.enum(${JSON.stringify([...element.definition])} as any)`
        }
      } else {
        return {
          zodSchema:z.any(),
          description: `z.any()`
        };
      }
      break;
    }
    case "schemaReference": {
      return {
        zodSchema: z.lazy(((optional:boolean) => {
          const references = getSchemaReferences();
          if (references && references[element.definition]) {
            return optional?references[element.definition].zodSchema.optional():references[element.definition].zodSchema;
          } else {
            throw new Error(
              "when converting optional" +
                name +
                "could not find schema" +
                element.definition +
                " in " +
                Object.keys(references)
            );
          }
        }).bind(null,element.optional)),
        description: `z.lazy(() =>references[${element.definition}].zodSchema` + (element.optional?'.optional()':''),
      };
      break;
    }
    case "object": {
      console.log("getZodSchemaFromJsonZodSchema",name," object element",element,"optional",optional);
      const sub = Object.fromEntries(Object.entries(element.definition).map(a=>[a[0],jzodSchemaToZodSchema(name, a[1], getSchemaReferences, generateForTs)]))
      const schemas =  Object.fromEntries(Object.entries(sub).map(a=>[a[0],a[1].zodSchema]));
      const descriptions =  Object.fromEntries(Object.entries(sub).map(a=>[a[0],a[1].description]));
      return {
        zodSchema: element.optional?z.object(schemas as any).optional():z.object(schemas as any),
        description: element.optional?`z.object(${JSON.stringify(descriptions)})`:`z.object(${JSON.stringify(descriptions)}).optional()`
      }
      break;
    }
    case "simpleType": {
      return {
        zodSchema: element.optional?(z as any)[element.definition]().optional():(z as any)[element.definition](),
        description: element.optional?`z.${element.definition}().optional()`:`z.${element.definition}()`
      }
      break;
    }
    case "array": {
      const sub = jzodSchemaToZodSchema(name, element.definition, getSchemaReferences, generateForTs);
      return {
        zodSchema: element.optional?z.array(sub.zodSchema).optional():z.array(sub.zodSchema),
        description: element.optional?`z.array(${sub.description}).optional()`:`z.array(${sub.description})`
      }
      break;
    }
    case "union": {
      const sub = (element as JzodUnion).definition.map(e=>jzodSchemaToZodSchema(name, e, getSchemaReferences, generateForTs))
      return {
        zodSchema:z.union( sub.map(s=>s.zodSchema)as any),
        description:`z.union(${JSON.stringify(sub.map(s=>s.description))})`
      }
      break;
    }
    case "record": {
      const sub = jzodSchemaToZodSchema(name, element.definition, getSchemaReferences, generateForTs)
      return {
        zodSchema:z.record(z.string(),sub.zodSchema),
        description:`z.record(z.string(),${sub.description})`,
      }
    }
    default:
      throw new Error("could not convert given json Zod schema, unknown type:" + element["type"])
      break;
  }
}


export function referentialElementDependencies(element:JzodReferentialElement | JzodReferentialElement):string[] {
  console.log("referentialElementDependencies called for",element.type);
  let result: string[]
  switch (element.type) {
    // case "simpleBootstrapElement":
    case "literal":
    case "simpleType":
    case "enum": {
      result = []
      break;
    }
    case "function": {
      result = []
      break;
    }
    case "schemaReference": {
      result = [element.definition];
      break;
    }
    case "lazy":
    case "record":
    case "array":{
      result = referentialElementDependencies(element.definition)
      break;
    }
    case "union":{ // definition is an array of ZodReferentialElement
      result = element.definition.reduce((acc:string[],curr:JzodReferentialElement)=>acc.concat(referentialElementDependencies(curr)),[]);
      break;
    }
    case "object": { // definition is an object of ZodReferentialElement
      result = Object.entries(element.definition).reduce((acc:string[],curr:[string,JzodReferentialElement])=>acc.concat(referentialElementDependencies(curr[1])),[]);
      break;
    }
    default:
      result = []
      break;
  }

  return result.filter((s)=>s != "ZodSimpleBootstrapElementSchema")
}
// ##############################################################################################################
export function _zodToJsonSchema(referentialSet:JzodToZodResult, dependencies:{[k:string]:string[]},name?: string):{[k:string]:any} {
  const referentialSetEntries = Object.entries(referentialSet);
  let result:{[k:string]:any} = {};

  for (const entry of referentialSetEntries) {
    const localDependencies = dependencies[entry[0]];
    const localReferentialSet = Object.fromEntries(
      Object.entries(referentialSet)
        .filter((e) => (localDependencies && localDependencies.includes(e[0])) || e[0] == entry[0])
        .map((e) => [e[0], e[1].zodSchema])
    );
    const convertedCurrent = zodToJsonSchema(entry[1].zodSchema, {$refStrategy:"relative",definitions:localReferentialSet});
    result[entry[0]] = convertedCurrent;
  }
  return result;
}


