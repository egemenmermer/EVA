"""
Wrapper script for the main application that applies patches before importing FastAPI
"""

print("🔧 Applying compatibility patches for Python 3.12...")

# Apply patches before any other imports
try:
    import patch
    print("✅ Compatibility patches applied successfully")
except Exception as e:
    print(f"⚠️ Error applying patches: {e}")
    print("⚠️ Application may not work correctly")

# Now import and re-export the main app
print("📤 Starting FastAPI application...")
try:
    from main import app
    print("✅ Application loaded successfully")
except Exception as e:
    print(f"❌ Failed to load application: {e}")
    raise

# This allows 'uvicorn main_wrapper:app' to work
__all__ = ['app'] 