import sqlite3 from "sqlite3";
import { BaseStorageProvider } from "./base-storage-provider.js";
import { Edge, Node } from "./types.js";

type Database = sqlite3.Database;

type NodeRow = {
  id: string;
  type: string;
  properties: string;
};

type EdgeRow = {
  id: string;
  type: string;
  from_id: string;
  to_id: string;
  properties: string;
};

function run(db: Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function get<T>(db: Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row as T | undefined);
    });
  });
}

function all<T>(db: Database, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows as T[]);
    });
  });
}

function rowToNode(row: NodeRow): Node {
  return {
    id: row.id,
    type: row.type,
    properties: JSON.parse(row.properties),
  };
}

function rowToEdge(row: EdgeRow): Edge {
  return {
    id: row.id,
    type: row.type,
    from: row.from_id,
    to: row.to_id,
    properties: JSON.parse(row.properties),
  };
}

export class SqliteStorageProvider extends BaseStorageProvider {
  private readonly db: Database;
  private readonly ready: Promise<void>;

  constructor(path: string) {
    super();
    this.db = new sqlite3.Database(path);
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await run(
      this.db,
      `CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        properties TEXT NOT NULL
      )`,
    );
    await run(
      this.db,
      `CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        properties TEXT NOT NULL
      )`,
    );
  }

  async getNode(id: string): Promise<Node> {
    await this.ready;
    const row = await get<NodeRow>(this.db, "SELECT id, type, properties FROM nodes WHERE id = ?", [
      id,
    ]);
    if (!row) {
      throw new Error(`Node with id "${id}" not found`);
    }
    return rowToNode(row);
  }

  async getNodes(ids: string[]): Promise<Node[]> {
    if (ids.length === 0) {
      return [];
    }

    await this.ready;
    const placeholders = ids.map(() => "?").join(", ");
    const rows = await all<NodeRow>(
      this.db,
      `SELECT id, type, properties FROM nodes WHERE id IN (${placeholders})`,
      ids,
    );
    const nodesById = new Map(rows.map((row) => [row.id, rowToNode(row)]));

    return ids.map((id) => {
      const node = nodesById.get(id);
      if (!node) {
        throw new Error(`Node with id "${id}" not found`);
      }
      return node;
    });
  }

  async createNode(node: Node): Promise<void> {
    await this.ready;
    const existing = await get<NodeRow>(this.db, "SELECT id FROM nodes WHERE id = ?", [node.id]);
    if (existing) {
      throw new Error(`Node with id "${node.id}" already exists`);
    }
    await run(this.db, "INSERT INTO nodes (id, type, properties) VALUES (?, ?, ?)", [
      node.id,
      node.type,
      JSON.stringify(node.properties),
    ]);
  }

  async updateNode(node: Node): Promise<void> {
    await this.ready;
    const existing = await get<NodeRow>(this.db, "SELECT id FROM nodes WHERE id = ?", [node.id]);
    if (!existing) {
      throw new Error(`Node with id "${node.id}" not found`);
    }
    await run(this.db, "UPDATE nodes SET type = ?, properties = ? WHERE id = ?", [
      node.type,
      JSON.stringify(node.properties),
      node.id,
    ]);
  }

  async upsertNode(node: Node): Promise<void> {
    await this.ready;
    await run(
      this.db,
      `INSERT INTO nodes (id, type, properties)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         properties = excluded.properties`,
      [node.id, node.type, JSON.stringify(node.properties)],
    );
  }

  async deleteNode(id: string): Promise<void> {
    await this.ready;
    await run(this.db, "DELETE FROM nodes WHERE id = ?", [id]);
  }

  async getEdge(id: string): Promise<Edge> {
    await this.ready;
    const row = await get<EdgeRow>(
      this.db,
      "SELECT id, type, from_id, to_id, properties FROM edges WHERE id = ?",
      [id],
    );
    if (!row) {
      throw new Error(`Edge with id "${id}" not found`);
    }
    return rowToEdge(row);
  }

  async getEdges(ids: string[]): Promise<Edge[]> {
    if (ids.length === 0) {
      return [];
    }

    await this.ready;
    const placeholders = ids.map(() => "?").join(", ");
    const rows = await all<EdgeRow>(
      this.db,
      `SELECT id, type, from_id, to_id, properties FROM edges WHERE id IN (${placeholders})`,
      ids,
    );
    const edgesById = new Map(rows.map((row) => [row.id, rowToEdge(row)]));

    return ids.map((id) => {
      const edge = edgesById.get(id);
      if (!edge) {
        throw new Error(`Edge with id "${id}" not found`);
      }
      return edge;
    });
  }

  async createEdge(edge: Edge): Promise<void> {
    await this.ready;
    const existing = await get<EdgeRow>(this.db, "SELECT id FROM edges WHERE id = ?", [edge.id]);
    if (existing) {
      throw new Error(`Edge with id "${edge.id}" already exists`);
    }
    await run(
      this.db,
      "INSERT INTO edges (id, type, from_id, to_id, properties) VALUES (?, ?, ?, ?, ?)",
      [edge.id, edge.type, edge.from, edge.to, JSON.stringify(edge.properties)],
    );
  }

  async updateEdge(edge: Edge): Promise<void> {
    await this.ready;
    const existing = await get<EdgeRow>(this.db, "SELECT id FROM edges WHERE id = ?", [edge.id]);
    if (!existing) {
      throw new Error(`Edge with id "${edge.id}" not found`);
    }
    await run(
      this.db,
      "UPDATE edges SET type = ?, from_id = ?, to_id = ?, properties = ? WHERE id = ?",
      [edge.type, edge.from, edge.to, JSON.stringify(edge.properties), edge.id],
    );
  }

  async upsertEdge(edge: Edge): Promise<void> {
    await this.ready;
    await run(
      this.db,
      `INSERT INTO edges (id, type, from_id, to_id, properties)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         from_id = excluded.from_id,
         to_id = excluded.to_id,
         properties = excluded.properties`,
      [edge.id, edge.type, edge.from, edge.to, JSON.stringify(edge.properties)],
    );
  }

  async deleteEdge(id: string): Promise<void> {
    await this.ready;
    await run(this.db, "DELETE FROM edges WHERE id = ?", [id]);
  }
}
