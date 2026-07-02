import {
  GraphClient,
  GeminiLLMProvider,
  SqliteStorageProvider,
  type Ontology,
} from "../src/index.js";
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
      embeddingModel: "gemini-embedding-001",
    }),
    ontology,
    enableEmbedding: true,
  });

  await client.ingestFromPath("examples/fixtures/marie-curie.txt");

  const result = await client.query(
    "How did Marie Curie's work shape the broader field of radioactivity?",
  );
  console.log(result);
}

main().catch((error) => {
  console.error("Example failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
