"""
Patch script for fixing Pydantic ForwardRef._evaluate issue with Python 3.12
This patch adds the missing recursive_guard parameter to the _evaluate method.
"""

import types
import typing
from typing import Any, Dict, ForwardRef, Optional, Set, cast

# Store original _evaluate method
original_evaluate = ForwardRef._evaluate

# Fixed version that properly handles the recursive_guard parameter
def patched_evaluate(self, globalns, localns, recursive_guard=None):
    """
    Modified _evaluate method that handles the recursive_guard parameter correctly.
    """
    # Just pass along to the original without adding another recursive_guard
    # The recursive_guard will come from the caller in Python 3.12
    try:
        return original_evaluate(self, globalns, localns, recursive_guard)
    except TypeError as e:
        # Handle the case for earlier Python versions that don't expect recursive_guard
        if "got an unexpected keyword argument 'recursive_guard'" in str(e):
            return original_evaluate(self, globalns, localns)
        raise

# Apply the patch directly to ForwardRef._evaluate
try:
    ForwardRef._evaluate = patched_evaluate
    print("✅ Successfully patched ForwardRef._evaluate for Python 3.12 compatibility")
except (AttributeError, TypeError) as e:
    print(f"⚠️ Failed to patch ForwardRef._evaluate: {e}")

# Also try to patch Pydantic's evaluate_forwardref function if it exists
try:
    import pydantic.typing
    if hasattr(pydantic.typing, 'evaluate_forwardref'):
        original_evaluate_forwardref = pydantic.typing.evaluate_forwardref
        
        def patched_evaluate_forwardref(type_, globalns, localns):
            """Modified version of evaluate_forwardref that works with Python 3.12"""
            if not localns:
                localns = {}
            # Use our patched evaluate method which handles the recursive_guard
            return type_._evaluate(globalns, localns, set())
        
        pydantic.typing.evaluate_forwardref = patched_evaluate_forwardref
        print("✅ Successfully patched Pydantic's evaluate_forwardref")
    else:
        print("⚠️ Pydantic's evaluate_forwardref function not found")
except ImportError:
    print("⚠️ Failed to import Pydantic module")

print("✓ Pydantic compatibility patches applied") 