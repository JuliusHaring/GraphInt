import { describe, expect, it } from "vitest";
import { Edge } from "../ontology.js";
import { expandNeighborhoodBfsWithLookup, shortestPathsWithLookup } from "./utils.js";

const edges: Edge[] = [
  { id: "e1", type: "parent_of", from: "aaron", to: "nadab", properties: {} },
  { id: "e2", type: "appears_in", from: "nadab", to: "leviticus", properties: {} },
  { id: "e3", type: "appears_in", from: "aaron", to: "exodus", properties: {} },
];

function edgeLookup(allEdges: Edge[]) {
  return (nodeId: string) => allEdges.filter((edge) => edge.from === nodeId || edge.to === nodeId);
}

describe("traversal with edge lookup", () => {
  it("expands neighborhoods without scanning the full edge list each hop", async () => {
    const neighborhood = await expandNeighborhoodBfsWithLookup(
      new Set(["aaron"]),
      edgeLookup(edges),
      2,
    );

    expect(new Set(neighborhood.nodeIds)).toEqual(
      new Set(["aaron", "nadab", "exodus", "leviticus"]),
    );
  });

  it("finds shortest paths with edge lookup", async () => {
    const paths = await shortestPathsWithLookup("aaron", "leviticus", edgeLookup(edges), 1);

    expect(paths[0]).toEqual({
      nodeIds: ["aaron", "nadab", "leviticus"],
      edges: [edges[0], edges[1]],
    });
  });
});
