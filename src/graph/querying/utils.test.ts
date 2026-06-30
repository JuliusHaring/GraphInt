import { describe, expect, it } from "vitest";
import { Edge } from "../ontology.js";
import {
  expandNeighborhood,
  expandNeighborhoodBfs,
  formatPathDescription,
  shortestPath,
} from "./utils.js";

const edges: Edge[] = [
  { id: "e1", type: "parent_of", from: "aaron", to: "nadab", properties: {} },
  { id: "e2", type: "appears_in", from: "nadab", to: "leviticus", properties: {} },
  { id: "e3", type: "appears_in", from: "aaron", to: "exodus", properties: {} },
  { id: "e4", type: "teaches", from: "moses", to: "commandments", properties: {} },
  { id: "e5", type: "member_of", from: "moses", to: "israelites", properties: {} },
];

describe("expandNeighborhoodBfs", () => {
  it("matches 1-hop expansion when maxHops is 1", () => {
    const seeds = new Set(["aaron"]);
    expect(expandNeighborhoodBfs(seeds, edges, 1)).toEqual(expandNeighborhood(seeds, edges));
  });

  it("reaches 2-hop nodes when maxHops is 2", () => {
    const neighborhood = expandNeighborhoodBfs(new Set(["aaron"]), edges, 2);

    expect(neighborhood.nodeIds).toEqual(new Set(["aaron", "nadab", "exodus", "leviticus"]));
    expect(neighborhood.edges.map((edge) => edge.id).sort()).toEqual(["e1", "e2", "e3"]);
  });

  it("does not expand beyond maxHops", () => {
    const neighborhood = expandNeighborhoodBfs(new Set(["moses"]), edges, 1);

    expect(neighborhood.nodeIds).toEqual(new Set(["moses", "commandments", "israelites"]));
    expect(neighborhood.edges.map((edge) => edge.id).sort()).toEqual(["e4", "e5"]);
  });
});

describe("shortestPath", () => {
  it("finds a multi-hop path", () => {
    const path = shortestPath("aaron", "leviticus", edges);

    expect(path).toEqual({
      nodeIds: ["aaron", "nadab", "leviticus"],
      edges: [edges[0], edges[1]],
    });
  });

  it("returns a single-node path for identical endpoints", () => {
    expect(shortestPath("moses", "moses", edges)).toEqual({
      nodeIds: ["moses"],
      edges: [],
    });
  });

  it("returns undefined when no path exists", () => {
    expect(shortestPath("leviticus", "israelites", edges)).toBeUndefined();
  });
});

describe("formatPathDescription", () => {
  it("describes each hop in the path", () => {
    const path = shortestPath("aaron", "leviticus", edges)!;
    const nodesById = new Map([
      ["aaron", { id: "aaron", type: "person", properties: { name: "Aaron" } }],
      ["nadab", { id: "nadab", type: "person", properties: { name: "Nadab" } }],
      ["leviticus", { id: "leviticus", type: "book", properties: { name: "Leviticus" } }],
    ]);

    const description = formatPathDescription(nodesById, path);

    expect(description).toContain("Aaron");
    expect(description).toContain("Nadab");
    expect(description).toContain("Leviticus");
    expect(description).toContain("parent_of");
    expect(description).toContain("appears_in");
  });
});
