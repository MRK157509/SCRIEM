# seed_rbac_users.py
from passlib.context import CryptContext

from app.database import SessionLocal
from app.models_legacy import User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS = [
    {"username": "admin", "password": "admin_password", "role": "ADMIN"},
    {"username": "analyst", "password": "analyst_password", "role": "SOC_ANALYST"},
    {"username": "user", "password": "user_password", "role": "USER"},
]


def upsert_user(db, username: str, password: str, role: str):
    u = db.query(User).filter(User.username == username).first()
    if u:
        u.password_hash = pwd.hash(password)
        u.role = role
        db.add(u)
        db.commit()
        print(f"✅ Updated: {username} -> role={role} (password reset)")
        return

    u = User(username=username, password_hash=pwd.hash(password), role=role)
    db.add(u)
    db.commit()
    print(f"✅ Created: {username} -> role={role}")


def main():
    db = SessionLocal()
    try:
        for row in USERS:
            upsert_user(db, row["username"], row["password"], row["role"])
    finally:
        db.close()

    print("\nSeeded RBAC users:")
    for row in USERS:
        print(f" - {row['role']}: {row['username']} / {row['password']}")
    print("\n⚠️ Change these passwords after confirming login (Phase 8 hardening).")


if __name__ == "__main__":
    main()
