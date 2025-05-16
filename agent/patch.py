"""
Patch script for fixing Pydantic ForwardRef._evaluate issue with Python 3.12
This patch adds the missing recursive_guard parameter to the _evaluate method.
"""

import types
import typing
from typing import Any, Dict, ForwardRef, Optional, Set, cast

# This is the patched version of the evaluate_forwardref function from pydantic/typing.py
def patched_evaluate_forwardref(type_, globalns, localns):
    """
    Modified version of evaluate_forwardref that handles Python 3.12 compatibility
    by adding the required recursive_guard parameter.
    """
    if not localns:
        localns = {}
    return cast(Any, type_)._evaluate(globalns, localns, set(), recursive_guard=set())

# Apply the patch to the Pydantic typing module
try:
    import pydantic.typing
    if hasattr(pydantic.typing, 'evaluate_forwardref'):
        # Store the original function in case we need to restore it
        original_evaluate_forwardref = pydantic.typing.evaluate_forwardref
        # Apply our patched version
        pydantic.typing.evaluate_forwardref = patched_evaluate_forwardref
        print("✅ Successfully applied patch for Pydantic ForwardRef with Python 3.12")
    else:
        print("⚠️ Failed to patch Pydantic: evaluate_forwardref function not found")
except ImportError:
    print("⚠️ Failed to patch Pydantic: module not found")

# Also patch the ForwardRef._evaluate method directly
try:
    original_evaluate = ForwardRef._evaluate
    
    def new_evaluate(self, globalns, localns, recursive_guard=None):
        """
        Modified _evaluate method that handles the recursive_guard parameter.
        """
        if recursive_guard is None:
            recursive_guard = set()
        return original_evaluate(self, globalns, localns, recursive_guard)
    
    ForwardRef._evaluate = new_evaluate
    print("✅ Successfully patched ForwardRef._evaluate for Python 3.12 compatibility")
except (AttributeError, TypeError) as e:
    print(f"⚠️ Failed to patch ForwardRef._evaluate: {e}")

print("✓ Pydantic compatibility patches applied") 