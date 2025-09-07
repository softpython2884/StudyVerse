export const DDL_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        avatarUrl TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS binders (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT PRIMARY KEY,
        binder_id TEXT NOT NULL,
        title TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (binder_id) REFERENCES binders(id) ON DELETE CASCADE
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS notebook_tags (
        notebook_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (notebook_id, tag),
        FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        notebook_id TEXT NOT NULL,
        title TEXT NOT NULL,
        icon TEXT,
        type TEXT CHECK(type IN ('course', 'note')),
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
    );
  `
];
