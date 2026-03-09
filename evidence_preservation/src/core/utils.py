import sqlite3
from datetime import datetime, timedelta

# This function handles watermark manager
class WatermarkManager:
    def __init__(self, db_path='watermarks.db'):
        self.db_path = db_path
        self._init_db()

    # This function handles init db
    def _init_db(self):
        """Initialize local SQLite database for watermarks."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS watermarks
                     (source TEXT PRIMARY KEY, last_timestamp TEXT)''')
        conn.commit()
        conn.close()

    # This function handles get last timestamp
    def get_last_timestamp(self, source):
        """Get the last fetched timestamp."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT last_timestamp FROM watermarks WHERE source=?", (source,))
        row = c.fetchone()
        conn.close()
        if row:
            return datetime.fromisoformat(row[0])
        else:
            return datetime.utcnow() - timedelta(days=1)

    # This function handles update watermark
    def update_watermark(self, source, timestamp):
        """Update the watermark."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("INSERT OR REPLACE INTO watermarks (source, last_timestamp) VALUES (?, ?)",
                  (source, timestamp.isoformat()))
        conn.commit()
        conn.close()
