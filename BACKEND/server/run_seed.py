#!/usr/bin/env python3
"""
Script to seed the database with sample data
Run this script to populate the database with initial data for testing
"""

import sys
import os

# Add the server directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from seed import seed_database

def main():
    """Main function to run the seeding process"""
    print("Starting database seeding process...")
    
    # Use the Flask app
    
    with app.app_context():
        try:
            seed_database()
            print("\n✅ Database seeding completed successfully!")
            print("\nDefault login credentials:")
            print("Admin: admin@liquorstore.com / password123")
            print("Employee: john@liquorstore.com / password123")
            print("Employee: mary@liquorstore.com / password123")
            print("Manager: manager@liquorstore.com / password123")
            
        except Exception as e:
            print(f"\n❌ Error during seeding: {str(e)}")
            return 1
    
    return 0

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)

