import { Ontology } from "../src/graph/ontology.js";
import { GraphClient } from "../src/index.js";
import { GeminiLLMProvider } from "../src/llm/gemini-llm-provider.js";
import { SqliteStorageProvider } from "../src/storage/sqlite-storage-provider.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const ontology: Ontology = {
    nodeTypes: [
      {
        id: "person",
        name: "Person",
        properties: {
          name: "string",
          tags: { type: "array", items: "string" },
          meta: { type: "object", properties: { active: "boolean" } },
        },
      },
      {
        id: "company",
        name: "Company",
        properties: {
          name: "string",
        },
      },
      {
        id: "accomplishment",
        name: "Accomplishment",
        properties: {
          name: "string",
        },
      },
    ],
    edgeTypes: [
      {
        id: "works_at",
        name: "Works At",
        from: "person",
        to: "company",
        properties: {
          since: "number",
        },
      },
      {
        id: "achieved",
        name: "Achieved",
        from: "person",
        to: "accomplishment",
        properties: {
          date: "date",
        },
      },
    ],
  };

  const client = new GraphClient({
    storageProvider: new SqliteStorageProvider(".data/simple-graph.db"),
    llmProvider: new GeminiLLMProvider({
      apiKey: process.env.GOOGLE_API_KEY || "",
      model: "gemini-3.1-flash-lite",
    }),
    ontology,
  });

  const result = await client.ingestFromPath("examples/fixtures/marie-curie.txt");

  const node = await client.getNode(result.nodes[0].id);
  console.log(node);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
