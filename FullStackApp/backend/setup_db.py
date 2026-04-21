"""
Helper script to create the PostgreSQL database.
Run: python setup_db.py

It will:
1. Connect to PostgreSQL default 'postgres' database
2. Create 'resume_screener' database if it doesn't exist
3. Test the connection
"""
import sys

def main():
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)

    # Read password from .env file
    db_url = None
    try:
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    db_url = line.strip().split("=", 1)[1]
                    break
    except FileNotFoundError:
        pass

    if not db_url or "yourpassword" in db_url:
        print("=" * 60)
        print("  PostgreSQL Database Setup")
        print("=" * 60)
        password = input("\nEnter your PostgreSQL password: ").strip()
        if not password:
            print("ERROR: Password cannot be empty.")
            sys.exit(1)
    else:
        # Extract password from URL
        # postgresql://postgres:PASSWORD@localhost:5432/resume_screener
        try:
            password = db_url.split("://")[1].split(":")[1].split("@")[0]
        except Exception:
            password = input("\nEnter your PostgreSQL password: ").strip()

    # Connect to default 'postgres' database to create our DB
    print(f"\n→ Connecting to PostgreSQL...")
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password=password,
            dbname="postgres",
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("  ✅ Connected to PostgreSQL")
    except Exception as e:
        print(f"  ❌ Connection failed: {e}")
        sys.exit(1)

    # Check if database exists
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = 'resume_screener'")
    exists = cur.fetchone()

    if exists:
        print("  ✅ Database 'resume_screener' already exists")
    else:
        print("  → Creating database 'resume_screener'...")
        cur.execute("CREATE DATABASE resume_screener")
        print("  ✅ Database 'resume_screener' created")

    cur.close()
    conn.close()

    # Update .env with correct password
    try:
        with open(".env", "r") as f:
            content = f.read()
        
        new_url = f"postgresql://postgres:{password}@localhost:5432/resume_screener"
        content = content.replace(
            "DATABASE_URL=" + content.split("DATABASE_URL=")[1].split("\n")[0],
            f"DATABASE_URL={new_url}"
        )
        
        with open(".env", "w") as f:
            f.write(content)
        print(f"  ✅ Updated .env with correct DATABASE_URL")
    except Exception as e:
        print(f"  ⚠️  Could not update .env: {e}")
        print(f"     Manually set: DATABASE_URL={new_url}")

    # Test connection to the new database
    print(f"\n→ Testing connection to 'resume_screener'...")
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password=password,
            dbname="resume_screener",
        )
        cur = conn.cursor()
        cur.execute("SELECT version()")
        version = cur.fetchone()[0]
        print(f"  ✅ Connected! {version}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"  ❌ Connection test failed: {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  Setup complete! You can now start the server:")
    print("  uvicorn app.main:app --reload --port 8001")
    print("=" * 60)


if __name__ == "__main__":
    main()
