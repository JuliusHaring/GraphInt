import { Ontology } from "../../src/graph/ontology.js";

/** Minimal properties — every field in the ontology schema is required at ingest time. */
export const bibleOntology: Ontology = {
  nodeTypes: [
    { id: "person", name: "Person", properties: { name: "string" } },
    { id: "place", name: "Place", properties: { name: "string" } },
    { id: "event", name: "Event", properties: { name: "string" } },
    { id: "book", name: "Book", properties: { name: "string" } },
    { id: "group", name: "Group", properties: { name: "string" } },
    { id: "teaching", name: "Teaching", properties: { name: "string" } },
  ],
  edgeTypes: [
    { id: "appears_in", name: "Appears In", from: "person", to: "book", properties: {} },
    { id: "authored", name: "Authored", from: "person", to: "book", properties: {} },
    { id: "born_in", name: "Born In", from: "person", to: "place", properties: {} },
    { id: "died_in", name: "Died In", from: "person", to: "place", properties: {} },
    {
      id: "participated_in",
      name: "Participated In",
      from: "person",
      to: "event",
      properties: {},
    },
    { id: "occurred_at", name: "Occurred At", from: "event", to: "place", properties: {} },
    { id: "located_in", name: "Located In", from: "place", to: "place", properties: {} },
    { id: "leads", name: "Leads", from: "person", to: "group", properties: {} },
    { id: "member_of", name: "Member Of", from: "person", to: "group", properties: {} },
    { id: "parent_of", name: "Parent Of", from: "person", to: "person", properties: {} },
    { id: "spouse_of", name: "Spouse Of", from: "person", to: "person", properties: {} },
    {
      id: "successor_of",
      name: "Successor Of",
      from: "person",
      to: "person",
      properties: {},
    },
    { id: "mentions", name: "Mentions", from: "book", to: "person", properties: {} },
    { id: "describes", name: "Describes", from: "book", to: "event", properties: {} },
    { id: "teaches", name: "Teaches", from: "person", to: "teaching", properties: {} },
  ],
};
