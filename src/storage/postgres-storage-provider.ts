import pg from "pg";
import { BaseStorageProvider, StorageProviderOptions } from "./base-storage-provider.js";
import { Edge, Node } from "./types.js";
import { PropertyValue } from "../graph/ontology.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("PostgresStorageProvider");

const { Pool } = pg;

type NodeRow = {
  id: string;
  type: string;
  properties: Record<string, PropertyValue>;
  embedding: number[] | null;
};

type EdgeRow = {
  id: string;
  type: string;
  from_id: string;
  to_id: string;
  properties: Record<string, PropertyValue>;
  embedding: number[] | null;
};

function rowToNode(row: NodeRow): Node {
  return {
    id: row.id,
    type: row.type,
    properties: row.properties,
    ...(row.embedding ? { embedding: row.embedding } : {}),
  };
}

function rowToEdge(row: EdgeRow): Edge {
  return {
    id: row.id,
    type: row.type,
    from: row.from_id,
    to: row.to_id,
    properties: row.properties,
    ...(row.embedding ? { embedding: row.embedding } : {}),
  };
}

export type PostgresStorageProviderOptions = StorageProviderOptions & {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | pg.ConnectionConfig["ssl"];
  pool?: pg.Pool;
};

export class PostgresStorageProvider extends BaseStorageProvider {
  private readonly pool: pg.Pool;
  private readonly ownsPool: boolean;
  private readonly ready: Promise<void>;

  constructor(connectionString: string | PostgresStorageProviderOptions) {
    const options = typeof connectionString === "string" ? { connectionString } : connectionString;
    super(options);

    if (options.pool) {
      this.pool = options.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        connectionString: options.connectionString,
        host: options.host,
        port: options.port,
        database: options.database,
        user: options.user,
        password: options.password,
        ssl: options.ssl,
      });
      this.ownsPool = true;
    }

    this.ready = this.init();
    log.info("Connected to PostgreSQL");
  }

  private async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS nodes (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          properties JSONB NOT NULL,
          embedding JSONB
        );

        CREATE TABLE IF NOT EXISTS edges (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          from_id TEXT NOT NULL,
          to_id TEXT NOT NULL,
          properties JSONB NOT NULL,
          embedding JSONB
        );

        CREATE INDEX IF NOT EXISTS idx_edges_from_id ON edges (from_id);
        CREATE INDEX IF NOT EXISTS idx_edges_to_id ON edges (to_id);
      `);
      log.debug("Database initialized");
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
      log.info("Closed PostgreSQL pool");
    }
  }

  async getNode(id: string): Promise<Node> {
    await this.ready;
    const result = await this.pool.query<NodeRow>(
      "SELECT id, type, properties, embedding FROM nodes WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      throw this.notFound("Node", id);
    }
    return rowToNode(row);
  }

  async getNodes(ids: string[]): Promise<Node[]> {
    if (ids.length === 0) {
      return [];
    }

    await this.ready;
    const result = await this.pool.query<NodeRow>(
      "SELECT id, type, properties, embedding FROM nodes WHERE id = ANY($1::text[])",
      [ids],
    );
    const nodesById = new Map(result.rows.map((row) => [row.id, rowToNode(row)]));

    return ids.map((id) => {
      const node = nodesById.get(id);
      if (!node) {
        throw this.notFound("Node", id);
      }
      return node;
    });
  }

  async listNodes(): Promise<Node[]> {
    await this.ready;
    const result = await this.pool.query<NodeRow>(
      "SELECT id, type, properties, embedding FROM nodes",
    );
    return result.rows.map(rowToNode);
  }

  async createNode(node: Node): Promise<void> {
    await this.ready;
    const existing = await this.pool.query("SELECT id FROM nodes WHERE id = $1", [node.id]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw this.alreadyExists("Node", node.id);
    }

    await this.pool.query(
      "INSERT INTO nodes (id, type, properties, embedding) VALUES ($1, $2, $3, $4)",
      [node.id, node.type, node.properties, node.embedding ?? null],
    );
    log.debug("Created node", { id: node.id });
  }

  async updateNode(node: Node): Promise<void> {
    await this.ready;
    const result = await this.pool.query(
      "UPDATE nodes SET type = $2, properties = $3, embedding = $4 WHERE id = $1",
      [node.id, node.type, node.properties, node.embedding ?? null],
    );
    if (!result.rowCount) {
      throw this.notFound("Node", node.id);
    }
    log.debug("Updated node", { id: node.id });
  }

  async upsertNode(node: Node): Promise<void> {
    await this.ready;
    await this.pool.query(
      `INSERT INTO nodes (id, type, properties, embedding)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         type = EXCLUDED.type,
         properties = EXCLUDED.properties,
         embedding = EXCLUDED.embedding`,
      [node.id, node.type, node.properties, node.embedding ?? null],
    );
    log.debug("Upserted node", { id: node.id });
  }

  async deleteNode(id: string): Promise<void> {
    await this.ready;
    await this.pool.query("DELETE FROM nodes WHERE id = $1", [id]);
    log.debug("Deleted node", { id });
  }

  async getEdge(id: string): Promise<Edge> {
    await this.ready;
    const result = await this.pool.query<EdgeRow>(
      "SELECT id, type, from_id, to_id, properties, embedding FROM edges WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      throw this.notFound("Edge", id);
    }
    return rowToEdge(row);
  }

  async getEdges(ids: string[]): Promise<Edge[]> {
    if (ids.length === 0) {
      return [];
    }

    await this.ready;
    const result = await this.pool.query<EdgeRow>(
      "SELECT id, type, from_id, to_id, properties, embedding FROM edges WHERE id = ANY($1::text[])",
      [ids],
    );
    const edgesById = new Map(result.rows.map((row) => [row.id, rowToEdge(row)]));

    return ids.map((id) => {
      const edge = edgesById.get(id);
      if (!edge) {
        throw this.notFound("Edge", id);
      }
      return edge;
    });
  }

  async listEdges(): Promise<Edge[]> {
    await this.ready;
    const result = await this.pool.query<EdgeRow>(
      "SELECT id, type, from_id, to_id, properties, embedding FROM edges",
    );
    return result.rows.map(rowToEdge);
  }

  async createEdge(edge: Edge): Promise<void> {
    await this.ready;
    const existing = await this.pool.query("SELECT id FROM edges WHERE id = $1", [edge.id]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw this.alreadyExists("Edge", edge.id);
    }

    await this.pool.query(
      "INSERT INTO edges (id, type, from_id, to_id, properties, embedding) VALUES ($1, $2, $3, $4, $5, $6)",
      [edge.id, edge.type, edge.from, edge.to, edge.properties, edge.embedding ?? null],
    );
    log.debug("Created edge", { id: edge.id });
  }

  async updateEdge(edge: Edge): Promise<void> {
    await this.ready;
    const result = await this.pool.query(
      `UPDATE edges
       SET type = $2, from_id = $3, to_id = $4, properties = $5, embedding = $6
       WHERE id = $1`,
      [edge.id, edge.type, edge.from, edge.to, edge.properties, edge.embedding ?? null],
    );
    if (!result.rowCount) {
      throw this.notFound("Edge", edge.id);
    }
    log.debug("Updated edge", { id: edge.id });
  }

  async upsertEdge(edge: Edge): Promise<void> {
    await this.ready;
    await this.pool.query(
      `INSERT INTO edges (id, type, from_id, to_id, properties, embedding)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         type = EXCLUDED.type,
         from_id = EXCLUDED.from_id,
         to_id = EXCLUDED.to_id,
         properties = EXCLUDED.properties,
         embedding = EXCLUDED.embedding`,
      [edge.id, edge.type, edge.from, edge.to, edge.properties, edge.embedding ?? null],
    );
    log.debug("Upserted edge", { id: edge.id });
  }

  async deleteEdge(id: string): Promise<void> {
    await this.ready;
    await this.pool.query("DELETE FROM edges WHERE id = $1", [id]);
    log.debug("Deleted edge", { id });
  }
}
