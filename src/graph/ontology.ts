import { z } from "zod";

export type PropertyType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | { type: "array"; items: PropertyType }
  | { type: "object"; properties: Record<string, PropertyType> };

export const DateValueSchema = z.union([
  z.date(),
  z.iso.date().transform((value) => parseIsoDateToUtc(value)),
  z.iso.datetime().transform((value) => new Date(value)),
  z
    .number()
    .int()
    .min(1000)
    .max(9999)
    .transform((year) => new Date(Date.UTC(year, 0, 1))),
  z
    .string()
    .regex(/^\d{4}$/)
    .transform((year) => new Date(Date.UTC(Number(year), 0, 1))),
]);

function parseIsoDateToUtc(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export const PropertyTypeSchema: z.ZodType<PropertyType> = z.lazy(() =>
  z.union([
    z.literal("string"),
    z.literal("number"),
    z.literal("boolean"),
    z.literal("date"),
    z.object({
      type: z.literal("array"),
      items: PropertyTypeSchema,
    }),
    z.object({
      type: z.literal("object"),
      properties: z.record(z.string(), PropertyTypeSchema),
    }),
  ]),
);

export const PropertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.date(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
  z.null(),
]);

export type PropertyValue = z.infer<typeof PropertyValueSchema>;

export const NodeTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  properties: z.record(z.string(), PropertyTypeSchema).optional().default({}),
});

export const EdgeTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  from: z.string(),
  to: z.string(),
  properties: z.record(z.string(), PropertyTypeSchema).optional().default({}),
});

export const OntologySchema = z
  .object({
    nodeTypes: z.array(NodeTypeSchema),
    edgeTypes: z.array(EdgeTypeSchema),
  })
  .superRefine((data, ctx) => {
    const nodeTypeIds = new Set<string>();

    data.nodeTypes.forEach((nodeType, index) => {
      if (nodeTypeIds.has(nodeType.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate node type id "${nodeType.id}"`,
          path: ["nodeTypes", index, "id"],
        });
      }
      nodeTypeIds.add(nodeType.id);
    });

    const edgeTypeIds = new Set<string>();

    data.edgeTypes.forEach((edgeType, index) => {
      if (edgeTypeIds.has(edgeType.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate edge type id "${edgeType.id}"`,
          path: ["edgeTypes", index, "id"],
        });
      }
      edgeTypeIds.add(edgeType.id);

      if (!nodeTypeIds.has(edgeType.from)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown node type "${edgeType.from}" referenced as edge source`,
          path: ["edgeTypes", index, "from"],
        });
      }

      if (!nodeTypeIds.has(edgeType.to)) {
        ctx.addIssue({
          code: "custom",
          message: `Unknown node type "${edgeType.to}" referenced as edge target`,
          path: ["edgeTypes", index, "to"],
        });
      }
    });
  });

export type Ontology = z.infer<typeof OntologySchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  properties: z.record(z.string(), PropertyValueSchema).optional().default({}),
  embedding: z.array(z.number()).optional(),
});

export type Node = z.infer<typeof NodeSchema>;

export const EdgeSchema = z.object({
  id: z.string(),
  type: z.string(),
  from: z.string(),
  to: z.string(),
  properties: z.record(z.string(), PropertyValueSchema).optional().default({}),
  embedding: z.array(z.number()).optional(),
});

export type Edge = z.infer<typeof EdgeSchema>;

export const GraphSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export type Graph = z.infer<typeof GraphSchema>;

export function serializeNodeForEmbedding(node: Pick<Node, "type" | "properties">): string {
  return JSON.stringify({ type: node.type, properties: node.properties });
}

export function serializeEdgeForEmbedding(
  edge: Pick<Edge, "type" | "from" | "to" | "properties">,
): string {
  return JSON.stringify({
    type: edge.type,
    from: edge.from,
    to: edge.to,
    properties: edge.properties,
  });
}

export function createPropertyValueValidator(propertyType: PropertyType): z.ZodType {
  if (propertyType === "string") {
    return z.string().nullable();
  }
  if (propertyType === "number") {
    return z.number().nullable();
  }
  if (propertyType === "boolean") {
    return z.boolean().nullable();
  }

  if (propertyType === "date") {
    return DateValueSchema.nullable();
  }

  if (propertyType.type === "array") {
    return z.array(createPropertyValueValidator(propertyType.items)).nullable();
  }

  const shape = Object.fromEntries(
    Object.entries(propertyType.properties).map(([key, type]) => [
      key,
      createPropertyValueValidator(type),
    ]),
  );

  return z.object(shape).nullable();
}

function normalizeInstanceProperties(
  properties: Record<string, unknown>,
  propertyTypes: Record<string, PropertyType>,
  pathPrefix: (string | number)[],
): { properties: Record<string, PropertyValue>; issues: z.ZodIssue[] } {
  const issues: z.ZodIssue[] = [];
  const normalized: Record<string, PropertyValue> = {};

  for (const key of Object.keys(properties)) {
    if (!(key in propertyTypes)) {
      issues.push({
        code: "custom",
        message: `Unknown property "${key}"`,
        path: [...pathPrefix, "properties", key],
      });
    }
  }

  for (const [key, propertyType] of Object.entries(propertyTypes)) {
    if (!(key in properties)) {
      issues.push({
        code: "custom",
        message: `Missing required property "${key}"`,
        path: [...pathPrefix, "properties"],
      });
      continue;
    }

    const result = createPropertyValueValidator(propertyType).safeParse(properties[key]);
    if (!result.success) {
      issues.push({
        code: "custom",
        message: `Invalid value for property "${key}"`,
        path: [...pathPrefix, "properties", key],
      });
      continue;
    }

    normalized[key] = result.data as PropertyValue;
  }

  return { properties: normalized, issues };
}

export class OntologyRegistry {
  private readonly nodeTypesById: Map<string, NodeType>;
  private readonly edgeTypesById: Map<string, EdgeType>;

  constructor(readonly ontology: Ontology) {
    this.nodeTypesById = new Map(ontology.nodeTypes.map((nodeType) => [nodeType.id, nodeType]));
    this.edgeTypesById = new Map(ontology.edgeTypes.map((edgeType) => [edgeType.id, edgeType]));
  }

  static parse(raw: unknown): OntologyRegistry {
    return new OntologyRegistry(OntologySchema.parse(raw));
  }

  getNodeType(id: string): NodeType | undefined {
    return this.nodeTypesById.get(id);
  }

  getEdgeType(id: string): EdgeType | undefined {
    return this.edgeTypesById.get(id);
  }

  parseNode(raw: unknown): Node {
    const node = NodeSchema.parse(raw);
    const nodeType = this.nodeTypesById.get(node.type);

    if (!nodeType) {
      throw new z.ZodError([
        {
          code: "custom",
          message: `Unknown node type "${node.type}"`,
          path: ["type"],
        },
      ]);
    }

    const { properties, issues } = normalizeInstanceProperties(
      node.properties,
      nodeType.properties,
      [],
    );

    if (issues.length > 0) {
      throw new z.ZodError(issues);
    }

    return { ...node, properties };
  }

  parseEdge(raw: unknown, nodesById?: ReadonlyMap<string, Node>): Edge {
    const edge = EdgeSchema.parse(raw);
    const edgeType = this.edgeTypesById.get(edge.type);

    if (!edgeType) {
      throw new z.ZodError([
        {
          code: "custom",
          message: `Unknown edge type "${edge.type}"`,
          path: ["type"],
        },
      ]);
    }

    const { properties, issues } = normalizeInstanceProperties(
      edge.properties,
      edgeType.properties,
      [],
    );

    if (nodesById) {
      const fromNode = nodesById.get(edge.from);
      const toNode = nodesById.get(edge.to);

      if (!fromNode) {
        issues.push({
          code: "custom",
          message: `Source node "${edge.from}" not found`,
          path: ["from"],
        });
      } else if (fromNode.type !== edgeType.from) {
        issues.push({
          code: "custom",
          message: `Source node type "${fromNode.type}" does not match edge type source "${edgeType.from}"`,
          path: ["from"],
        });
      }

      if (!toNode) {
        issues.push({
          code: "custom",
          message: `Target node "${edge.to}" not found`,
          path: ["to"],
        });
      } else if (toNode.type !== edgeType.to) {
        issues.push({
          code: "custom",
          message: `Target node type "${toNode.type}" does not match edge type target "${edgeType.to}"`,
          path: ["to"],
        });
      }
    }

    if (issues.length > 0) {
      throw new z.ZodError(issues);
    }

    return { ...edge, properties };
  }

  parseGraph(raw: unknown): Graph {
    const graph = GraphSchema.parse(raw);
    const issues: z.ZodIssue[] = [];

    const nodeIds = new Set<string>();
    graph.nodes.forEach((node, index) => {
      if (nodeIds.has(node.id)) {
        issues.push({
          code: "custom",
          message: `Duplicate node id "${node.id}"`,
          path: ["nodes", index, "id"],
        });
      }
      nodeIds.add(node.id);
    });

    const edgeIds = new Set<string>();
    graph.edges.forEach((edge, index) => {
      if (edgeIds.has(edge.id)) {
        issues.push({
          code: "custom",
          message: `Duplicate edge id "${edge.id}"`,
          path: ["edges", index, "id"],
        });
      }
      edgeIds.add(edge.id);
    });

    if (issues.length > 0) {
      throw new z.ZodError(issues);
    }

    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const validatedNodes = graph.nodes.map((node) => this.parseNode(node));
    const validatedEdges = graph.edges.map((edge) => this.parseEdge(edge, nodesById));

    return {
      nodes: validatedNodes,
      edges: validatedEdges,
    };
  }
}
