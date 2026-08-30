// worker/local-d1.ts
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Creates a local D1Database-compatible interface using Node.js built-in SQLite
 * Enables seamless preview, testing and development in Google AI Studio
 */
export function createLocalD1(dbPath?: string): D1Database {
  const filePath =
    dbPath || path.join(process.cwd(), ".wrangler", "state", "v3", "d1", "local.sqlite");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const db = new DatabaseSync(filePath);

  // Auto-apply D1 migrations
  const migrationPath = path.join(process.cwd(), "migrations", "0001_init.sql");
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    db.exec(sql);
  }

  function createStatement(query: string, boundParams: any[] = []): D1PreparedStatement {
    return {
      bind(...params: any[]) {
        return createStatement(query, params);
      },
      async first<T = unknown>(colName?: string): Promise<T | null> {
        try {
          const stmt = db.prepare(query);
          const row = stmt.get(...boundParams) as any;
          if (!row) return null;
          if (colName) return (row[colName] as T) ?? null;
          return row as T;
        } catch (e) {
          console.error("[Local D1 first error]:", query, boundParams, e);
          throw e;
        }
      },
      async all<T = unknown>(): Promise<D1Result<T>> {
        try {
          const stmt = db.prepare(query);
          const rows = stmt.all(...boundParams) as T[];
          return {
            results: rows || [],
            success: true,
            meta: {} as any,
          };
        } catch (e) {
          console.error("[Local D1 all error]:", query, boundParams, e);
          throw e;
        }
      },
      async run(): Promise<D1Response> {
        try {
          const stmt = db.prepare(query);
          const info = stmt.run(...boundParams);
          return {
            success: true,
            meta: {
              changes: Number(info.changes),
              last_row_id: Number(info.lastInsertRowid),
              duration: 0,
            } as any,
          };
        } catch (e) {
          console.error("[Local D1 run error]:", query, boundParams, e);
          throw e;
        }
      },
      async raw(): Promise<any[]> {
        const res = await this.all();
        return (res.results || []).map((r: any) => Object.values(r));
      },
    } as unknown as D1PreparedStatement;
  }

  return {
    prepare(query: string) {
      return createStatement(query);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      db.exec("BEGIN");
      try {
        for (const s of statements) {
          const res = await (s as any).all();
          results.push(res);
        }
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return results;
    },
    async exec(query: string) {
      db.exec(query);
      return { count: 0, duration: 0 };
    },
    dump() {
      throw new Error("dump not implemented");
    },
  } as unknown as D1Database;
}
