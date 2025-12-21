-- Machines (registered client computers)
CREATE TABLE machines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hostname TEXT,
    ip_address TEXT,
    registration_date DATETIME NOT NULL,
    last_seen DATETIME,
    is_online BOOLEAN DEFAULT 0,
    api_key TEXT NOT NULL UNIQUE,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Machine State (latest snapshot)
CREATE TABLE machine_state (
    machine_id TEXT PRIMARY KEY,
    last_activity_time DATETIME,
    active_window TEXT,
    screenshot_count INTEGER DEFAULT 0,
    upload_count INTEGER DEFAULT 0,
    health_status TEXT,
    settings TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Activity History
CREATE TABLE activity_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    active_window TEXT,
    process_name TEXT,
    duration INTEGER,
    username TEXT,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Screenshots Metadata
CREATE TABLE screenshots (
    id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL,
    capture_time DATETIME NOT NULL,
    trigger_type TEXT,
    google_drive_file_id TEXT,
    local_path TEXT,
    is_uploaded BOOLEAN DEFAULT 0,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Settings Queue (for offline machines)
CREATE TABLE settings_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT NOT NULL,
    settings TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    applied_at DATETIME,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Audit Events
CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT,
    username TEXT,
    timestamp DATETIME NOT NULL,
    details TEXT,
    source_log_name TEXT,
    is_flagged BOOLEAN DEFAULT 1,
    acknowledged BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Connection Events
CREATE TABLE connection_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_machines_last_seen ON machines(last_seen);
CREATE INDEX idx_activity_machine_time ON activity_history(machine_id, timestamp);
CREATE INDEX idx_screenshots_machine_time ON screenshots(machine_id, capture_time);
CREATE INDEX idx_audit_events_machine ON audit_events(machine_id, timestamp);
CREATE INDEX idx_connection_events_machine ON connection_events(machine_id, timestamp);
