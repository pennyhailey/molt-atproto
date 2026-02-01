/**
 * ClickHouse Database Implementation
 * 
 * Implements the Database interface for ClickHouse.
 * Uses the official @clickhouse/client package.
 */

import { createClient, ClickHouseClient, ResultSet } from '@clickhouse/client';
import { Database, DatabaseConfig } from './index.js';

export class ClickHouseDatabase implements Database {
  private client: ClickHouseClient;

  constructor(config: DatabaseConfig) {
    if (config.type !== 'clickhouse') {
      throw new Error('ClickHouseDatabase requires type: "clickhouse"');
    }

    this.client = createClient({
      host: config.host ?? 'http://localhost:8123',
      database: config.database ?? 'molt',
      username: config.username ?? 'default',
      password: config.password ?? '',
    });
  }

  /**
   * Execute a parameterized query and return results.
   * 
   * ClickHouse uses {name:Type} placeholder syntax.
   * Example: SELECT * FROM posts WHERE did = {did:String}
   */
  async query<T>(sql: string, params?: Record<string, unknown>): Promise<T[]> {
    const result = await this.client.query({
      query: sql,
      query_params: params,
      format: 'JSONEachRow',
    });

    const rows = await result.json<T[]>();
    return rows;
  }

  /**
   * Execute a write operation (insert, update, delete).
   * 
   * For INSERTs, we use the insert() method for better performance.
   * For other operations, we use command().
   */
  async execute(sql: string, params?: Record<string, unknown>): Promise<void> {
    // Check if this is an INSERT with VALUES
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\([^)]+\)\s*VALUES/i);
    
    if (insertMatch && params) {
      // Use query() for INSERT with params - ClickHouse handles it
      await this.client.query({
        query: sql,
        query_params: params,
      });
    } else {
      // For other operations (ALTER, DELETE, etc.)
      await this.client.command({
        query: sql,
        query_params: params,
      });
    }
  }

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    await this.client.close();
  }

  /**
   * Check if the database is healthy and reachable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.query({ query: 'SELECT 1' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the database schema.
   * Runs the schema.sql file to create tables if they don't exist.
   */
  async initializeSchema(schemaSQL: string): Promise<void> {
    // Split on semicolons and run each statement
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await this.client.command({ query: statement });
    }
  }
}

/**
 * Create a ClickHouse database instance from environment variables.
 */
export function createClickHouseFromEnv(): ClickHouseDatabase {
  return new ClickHouseDatabase({
    type: 'clickhouse',
    host: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
    database: process.env.CLICKHOUSE_DB ?? 'molt',
    username: process.env.CLICKHOUSE_USER ?? 'default',
    password: process.env.CLICKHOUSE_PASSWORD ?? '',
  });
}
