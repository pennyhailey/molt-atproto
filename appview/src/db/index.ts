/**
 * Database Interface
 * 
 * Abstract database interface for the Molt AppView.
 * Implementations can use ClickHouse, SQLite, or other backends.
 */

export interface Database {
  /**
   * Execute a parameterized query and return results.
   * Parameters use ClickHouse-style placeholders: {name:Type}
   */
  query<T>(sql: string, params?: Record<string, unknown>): Promise<T[]>;
  
  /**
   * Execute a write operation (insert, update, delete).
   */
  execute(sql: string, params?: Record<string, unknown>): Promise<void>;
  
  /**
   * Close the database connection.
   */
  close(): Promise<void>;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  type: 'clickhouse' | 'sqlite';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  path?: string;  // For SQLite
}

// Re-export implementations
export { ClickHouseDatabase, createClickHouseFromEnv } from './clickhouse.js';
