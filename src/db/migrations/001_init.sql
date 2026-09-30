-- Personas con las que compartí gastos o que me deben plata
CREATE TABLE people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Aliases para resolver "juan", "juancho", "JP" -> misma persona
CREATE TABLE person_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  alias TEXT NOT NULL UNIQUE
);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_ars REAL NOT NULL,
  amount_usd REAL,
  usd_rate REAL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  spent_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  raw_message TEXT NOT NULL,
  telegram_message_id INTEGER UNIQUE
);

CREATE TABLE debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id),
  amount_ars REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  settled_at TEXT,
  notes TEXT
);

-- Cola de mensajes pendientes de procesar (incluye estado de confirmaciones)
CREATE TABLE pending_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_message_id INTEGER NOT NULL UNIQUE,
  chat_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  received_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  confirmation_question TEXT,
  confirmation_context_json TEXT
);

CREATE INDEX idx_expenses_spent_at ON expenses(spent_at);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_pending_status ON pending_messages(status);
