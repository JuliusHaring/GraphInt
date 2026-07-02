# graphint

Graph intelligence library for ingesting documents, building typed knowledge graphs, and querying them with LLMs.

## Install

```bash
npm install graphint
```

Requires Node.js 18+.

## Quick start

```ts
import {
  GraphClient,
  GeminiLLMProvider,
  SqliteStorageProvider,
  type Ontology,
} from "graphint";

const ontology: Ontology = {
  nodeTypes: [
    { id: "person", name: "Person", properties: { name: "string" } },
    { id: "company", name: "Company", properties: { name: "string" } },
  ],
  edgeTypes: [
    { id: "works_at", name: "Works At", from: "person", to: "company" },
  ],
};

const client = new GraphClient({
  storageProvider: new SqliteStorageProvider(".data/graph.db"),
  llmProvider: new GeminiLLMProvider({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "gemini-2.5-flash",
    embeddingModel: "gemini-embedding-001",
  }),
  ontology,
  enableEmbedding: true,
});

await client.ingestFromPath("./document.pdf");
await client.ingestFromText("Alice works at Acme Corp.");

const answer = await client.query("Who works at Acme Corp?");
console.log(answer);
```

## API overview

`GraphClient` is the main entry point.

| Method | Description |
| --- | --- |
| `ingestFromPath(path)` | Extract entities from a file (PDF, DOCX, XLSX, plain text, …) |
| `ingestFromFile(file)` | Same as above, for `File` objects (e.g. in browsers) |
| `ingestFromText(text)` | Extract entities from raw text |
| `createNode` / `editNode` / `deleteNode` | CRUD for nodes |
| `createEdge` / `editEdge` / `deleteEdge` | CRUD for edges |
| `getNode` / `getEdge` | Read by id |
| `query(question, method?)` | Natural-language query over the graph |

### Storage providers

- `SqliteStorageProvider` — persistent local SQLite database
- `MemoryStorageProvider` — in-memory store for tests and ephemeral use

### LLM providers

- `OpenAILLMProvider` — OpenAI chat + embeddings
- `GeminiLLMProvider` — Google Gemini chat + embeddings

Bring your own by extending `BaseStorageProvider` or `BaseLLMProvider`.

### Ontology

Define node and edge types with typed properties. Use the `Ontology` type or validate at runtime with `OntologySchema`.

## License

MIT
