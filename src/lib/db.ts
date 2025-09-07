import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import { DDL_STATEMENTS } from './schema';

let db: Database | null = null;

const DB_FILE = process.env.DB_FILE || 'database.db';

export async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }

  const newDb = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  console.log('Database connected.');

  // Run DDL statements to create tables if they don't exist
  for (const statement of DDL_STATEMENTS) {
    await newDb.exec(statement);
    console.log(`Executed DDL: ${statement.substring(0, 50)}...`);
  }
  
  console.log('Database schema is up to date.');

  db = newDb;
  return db;
}
