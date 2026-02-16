import sqlite3

conn = sqlite3.connect("siem.db")
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE detection_rules ADD COLUMN match_contains TEXT DEFAULT ''")
    print("added match_contains")
except Exception as e:
    print("match_contains:", e)

try:
    cur.execute("ALTER TABLE detection_rules ADD COLUMN event_type TEXT DEFAULT ''")
    print("added event_type")
except Exception as e:
    print("event_type:", e)

try:
    cur.execute("ALTER TABLE detection_rules ADD COLUMN action TEXT DEFAULT ''")
    print("added action")
except Exception as e:
    print("action:", e)

conn.commit()
conn.close()
