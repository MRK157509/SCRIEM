from passlib.context import CryptContext

from app.database import SessionLocal, engine
from app.database import Base
from app.models import User


pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS = [
    {"username": "admin", "password": "admin123", "role": "ADMIN"},
    {"username": "analyst", "password": "analyst123", "role": "SOC_ANALYST"},
    {"username": "user", "password": "user123", "role": "USER"},
]

def main():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        created, updated = 0, 0

        for u in USERS:
            row = db.query(User).filter(User.username == u["username"]).first()

            if row is None:
                row = User(
                    username=u["username"],
                    role=u["role"],
                    password_hash=pwd.hash(u["password"]),
                )
                db.add(row)
                created += 1
            else:
                # Force standard creds (dev convenience)
                row.role = u["role"]
                row.password_hash = pwd.hash(u["password"])
                updated += 1

        db.commit()

        print(f"✅ Seeded users. created={created}, updated={updated}")
        print("Login creds:")
        print("  admin / admin123 (ADMIN)")
        print("  analyst / analyst123 (SOC_ANALYST)")
        print("  user / user123 (USER)")
    finally:
        db.close()

if __name__ == "__main__":
    main()
