#!/usr/bin/env python3
"""
Initialize the database with the correct schema.
Run this script to create the required tables for the agent.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import text

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from database.db_connector import metadata, DatabaseConnector

def initialize_database():
    """Create database tables if they don't exist."""
    # Load environment variables
    load_dotenv()
    
    # Get DB connection parameters
    user = os.getenv('POSTGRES_USER')
    password = os.getenv('POSTGRES_PASSWORD')
    host = os.getenv('POSTGRES_HOST')
    port = os.getenv('POSTGRES_PORT')
    db = os.getenv('POSTGRES_DB')
    ssl_mode = os.getenv('POSTGRES_SSL_MODE', 'disable')
    
    # Create database URL
    db_url = f"postgresql://{user}:{password}@{host}:{port}/{db}?sslmode={ssl_mode}"
    
    print(f"Connecting to database: {host}:{port}/{db}")
    
    # Create connector
    db = DatabaseConnector()
    
    # Check if tables exist
    inspector = db.engine.dialect.inspector
    tables = inspector.get_table_names(connection=db.engine.connect())
    
    if 'conversations' in tables or 'feedback' in tables:
        print("Tables already exist. Choose an option:")
        print("1. Drop all tables using CASCADE")
        print("2. Create tables without dropping")
        print("3. Exit without changes")
        
        choice = input("Enter option (1-3): ")
        
        if choice == '1':
            print("Dropping all tables with CASCADE...")
            with db.engine.begin() as connection:
                # Use raw SQL for CASCADE
                connection.execute(text("DROP TABLE IF EXISTS feedback CASCADE"))
                connection.execute(text("DROP TABLE IF EXISTS conversation_contents CASCADE"))
                connection.execute(text("DROP TABLE IF EXISTS conversations CASCADE"))
        elif choice == '2':
            print("Attempting to create tables without dropping...")
            # Will try to create only missing tables
        elif choice == '3':
            print("Exiting without changes.")
            return
        else:
            print("Invalid option. Exiting.")
            return
    
    # Create tables
    print("Creating tables...")
    metadata.create_all(db.engine)
    
    print("Database initialization complete.")

if __name__ == "__main__":
    initialize_database() 