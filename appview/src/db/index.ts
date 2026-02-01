/**
 * Database Interface
 * 
 * Defines the interface for database operations.
 * Implementations: MockDatabase (demo), ClickHouseDatabase (production)
 */

export interface Database {
  /**
   * Execute a read query and return results
   */
  query<T>(sql: string, params?: Record<string, unknown>): Promise<T[]>;

  /**
   * Execute a write operation
   */
  execute(sql: string, params?: Record<string, unknown>): Promise<void>;
}

// Re-export mock for convenience
export { createMockDatabase } from './mock';
