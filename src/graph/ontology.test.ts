import { describe, expect, it } from "vitest";
import { Node, OntologyRegistry } from "./ontology.js";

const sampleOntology = {
  nodeTypes: [
    {
      id: "person",
      name: "Person",
      properties: {
        name: "string",
        tags: { type: "array", items: "string" },
        meta: {
          type: "object",
          properties: { active: "boolean" },
        },
      },
    },
    {
      id: "company",
      name: "Company",
      properties: { name: "string" },
    },
  ],
  edgeTypes: [
    {
      id: "works_at",
      name: "Works At",
      from: "person",
      to: "company",
      properties: { since: "number" },
    },
  ],
};

describe("OntologyRegistry", () => {
  const registry = OntologyRegistry.parse(sampleOntology);

  it("rejects duplicate node type ids", () => {
    expect(() =>
      OntologyRegistry.parse({
        nodeTypes: [
          { id: "person", name: "Person", properties: {} },
          { id: "person", name: "Person 2", properties: {} },
        ],
        edgeTypes: [],
      }),
    ).toThrow();
  });

  it("rejects edge types referencing unknown node types", () => {
    expect(() =>
      OntologyRegistry.parse({
        nodeTypes: [{ id: "person", name: "Person", properties: {} }],
        edgeTypes: [
          {
            id: "works_at",
            name: "Works At",
            from: "person",
            to: "missing",
            properties: {},
          },
        ],
      }),
    ).toThrow();
  });

  it("validates a node against its type", () => {
    const node = registry.parseNode({
      id: "1",
      type: "person",
      properties: {
        name: "Alice",
        tags: ["engineer"],
        meta: { active: true },
      },
    });

    expect(node.properties.name).toBe("Alice");
  });

  it("rejects unknown node type", () => {
    expect(() =>
      registry.parseNode({
        id: "1",
        type: "unknown",
        properties: {},
      }),
    ).toThrow(/Unknown node type/);
  });

  it("rejects unknown and missing properties", () => {
    expect(() =>
      registry.parseNode({
        id: "1",
        type: "person",
        properties: { name: "Alice", extra: true },
      }),
    ).toThrow();

    expect(() =>
      registry.parseNode({
        id: "1",
        type: "person",
        properties: { tags: [], meta: { active: true } },
      }),
    ).toThrow(/Missing required property/);
  });

  it("validates edge endpoints against node types", () => {
    const nodes = new Map<string, Node>([
      [
        "p1",
        {
          id: "p1",
          type: "person",
          properties: { name: "Alice", tags: [], meta: { active: true } },
        },
      ],
      ["c1", { id: "c1", type: "company", properties: { name: "Acme" } }],
    ]);

    const edge = registry.parseEdge(
      {
        id: "e1",
        type: "works_at",
        from: "p1",
        to: "c1",
        properties: { since: 2020 },
      },
      nodes,
    );

    expect(edge.properties.since).toBe(2020);
  });

  it("rejects mismatched edge endpoints", () => {
    const nodes = new Map<string, Node>([
      ["c1", { id: "c1", type: "company", properties: { name: "Acme" } }],
      ["c2", { id: "c2", type: "company", properties: { name: "Other" } }],
    ]);

    expect(() =>
      registry.parseEdge(
        {
          id: "e1",
          type: "works_at",
          from: "c1",
          to: "c2",
          properties: { since: 2020 },
        },
        nodes,
      ),
    ).toThrow(/Source node type/);
  });

  it("coerces date properties to Date objects", () => {
    const registry = OntologyRegistry.parse({
      nodeTypes: [{ id: "person", name: "Person", properties: { born: "date" } }],
      edgeTypes: [
        {
          id: "achieved",
          name: "Achieved",
          from: "person",
          to: "person",
          properties: { date: "date" },
        },
      ],
    });

    const node = registry.parseNode({
      id: "1",
      type: "person",
      properties: { born: "1867-11-07" },
    });

    expect(node.properties.born).toEqual(new Date(Date.UTC(1867, 10, 7)));

    const nodes = new Map([[node.id, node]]);
    const edge = registry.parseEdge(
      {
        id: "e1",
        type: "achieved",
        from: "1",
        to: "1",
        properties: { date: "1911" },
      },
      nodes,
    );

    expect(edge.properties.date).toEqual(new Date(Date.UTC(1911, 0, 1)));

    const edgeFromNumber = registry.parseEdge(
      {
        id: "e2",
        type: "achieved",
        from: "1",
        to: "1",
        properties: { date: 1903 },
      },
      nodes,
    );

    expect(edgeFromNumber.properties.date).toEqual(new Date(Date.UTC(1903, 0, 1)));

    expect(() =>
      registry.parseNode({
        id: "2",
        type: "person",
        properties: { born: "not-a-date" },
      }),
    ).toThrow();
  });

  it("validates a full graph", () => {
    const graph = registry.parseGraph({
      nodes: [
        {
          id: "p1",
          type: "person",
          properties: { name: "Alice", tags: [], meta: { active: true } },
        },
        { id: "c1", type: "company", properties: { name: "Acme" } },
      ],
      edges: [
        {
          id: "e1",
          type: "works_at",
          from: "p1",
          to: "c1",
          properties: { since: 2020 },
        },
      ],
    });

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });
});
