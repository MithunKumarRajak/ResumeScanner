"""
Helper script to create the PostgreSQL database.
Run: python setup_db.py

It will:
1. Connect to PostgreSQL default 'postgres' database
2. Create the target database if it doesn't exist
3. Test the connection
"""
import sys
from urllib.parse import urlparse

def main():
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
        from psycopg2 import sql
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)

    # Read config from .env file
    db_url = None
    try:
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    db_url = line.strip().split("=", 1)[1]
                    break
    except FileNotFoundError:
        pass

    db_user = "postgres"
    db_host = "localhost"
    db_port = 5432
    db_password = ""
    db_name = "resume_screener"

    if db_url and "yourpassword" not in db_url:
        try:
            parsed = urlparse(db_url)
            db_user = parsed.username or db_user
            db_password = parsed.password or db_password
            db_host = parsed.hostname or db_host
            db_port = parsed.port or db_port
            if parsed.path and len(parsed.path) > 1:
                db_name = parsed.path.lstrip("/")
        except Exception:
            pass

    print("=" * 60)
    print("  PostgreSQL Database Setup")
    print("=" * 60)

    if not db_password:
        db_password = input(f"\nEnter password for PostgreSQL user '{db_user}' at {db_host}:{db_port}: ").strip()
        if not db_password:
            print("ERROR: Password cannot be empty.")
            sys.exit(1)

    # Connect to default 'postgres' database to create our DB
    print(f"\n→ Connecting to PostgreSQL at {db_host}:{db_port}...")
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            dbname="postgres",
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("   Connected to PostgreSQL")
    except Exception as e:
        print(f"   Connection failed: {e}")
        sys.exit(1)

    # Check if database exists
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
    exists = cur.fetchone()

    if exists:
        print(f"   Database '{db_name}' already exists")
    else:
        print(f"  → Creating database '{db_name}'...")
        # Safe parameterized database creation
        cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
        print(f"   Database '{db_name}' created")

    cur.close()
    conn.close()

    # Update .env with correct details
    new_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    try:
        with open(".env", "r") as f:
            content = f.read()
        
        if "DATABASE_URL=" in content:
            content = content.replace(
                "DATABASE_URL=" + content.split("DATABASE_URL=")[1].split("\n")[0],
                f"DATABASE_URL={new_url}"
            )
        else:
            content += f"\nDATABASE_URL={new_url}\n"
            
        with open(".env", "w") as f:
            f.write(content)
        print(f"   Updated .env with correct DATABASE_URL")
    except Exception as e:
        print(f"  ⚠️  Could not update .env: {e}")
        print(f"     Manually set: DATABASE_URL={new_url}")

    # Test connection to the new database
    print(f"\n→ Testing connection to '{db_name}'...")
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            dbname=db_name,
        )
        cur = conn.cursor()
        cur.execute("SELECT version()")
        version = cur.fetchone()[0]
        print(f"Connected! {version}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Connection test failed: {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  Setup complete! You can now start the server:")
    print("  uvicorn app.main:app --reload --port 8000")
    print("-" * 10)


if __name__ == "__main__":
    main()
