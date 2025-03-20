#!/usr/bin/env python3
"""
Database initialization script
This script recreates all database tables for the agent
"""

import os
import sys
import logging
from sqlalchemy import text

# Add the parent directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db_connector import metadata, DatabaseConnector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    """Initialize the database by dropping and recreating all tables."""
    try:
        # Connect to the database
        db = DatabaseConnector()
        
        # Drop all tables with CASCADE to handle dependencies
        logger.info("Dropping tables with CASCADE...")
        db.engine.execute(text("DROP TABLE IF EXISTS feedback CASCADE"))
        db.engine.execute(text("DROP TABLE IF EXISTS conversation_contents CASCADE"))
        db.engine.execute(text("DROP TABLE IF EXISTS conversations CASCADE"))
        
        # Create all tables
        logger.info("Creating tables...")
        metadata.create_all(db.engine)
        
        logger.info("Database initialization complete!")
        
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

if __name__ == "__main__":
    init_db() 