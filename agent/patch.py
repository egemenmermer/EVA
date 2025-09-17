"""
Patch script for fixing Pydantic ForwardRef._evaluate issue with Python 3.12
This patch handles the recursive_guard parameter properly when Python 3.12 passes it.
"""

import inspect
import typing
from typing import Any, ForwardRef

# Store original _evaluate method
original_evaluate = ForwardRef._evaluate

def patched_evaluate(self, globalns, localns, *args, **kwargs):
    """
    Patched _evaluate method that correctly handles the recursive_guard parameter
    for both Python 3.12 (which passes it) and earlier versions (which don't).
    """
    # Always ensure recursive_guard is passed as a keyword argument
    recursive_guard = None
    
    # First check if we got it as a keyword arg
    if 'recursive_guard' in kwargs:
        recursive_guard = kwargs['recursive_guard']
        # Remove it to avoid duplicate
        kwargs_copy = kwargs.copy()
        del kwargs_copy['recursive_guard']
    # Then check if we got it as a positional arg
    elif args and len(args) > 0:
        recursive_guard = args[0]
        args = args[1:] if len(args) > 1 else ()
    
    # Now call the original function with recursive_guard as a keyword arg
    try:
        return original_evaluate(self, globalns, localns, *args, recursive_guard=recursive_guard)
    except TypeError as e:
        if "got an unexpected keyword argument 'recursive_guard'" in str(e):
            # For Python versions that don't expect recursive_guard
            return original_evaluate(self, globalns, localns, *args)
        # For anything else, try another approach
        try:
            return original_evaluate(self, globalns, localns)
        except Exception:
            # Last resort, re-raise the original error
            raise e

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
            # Call patched _evaluate which handles recursive_guard properly
            return type_._evaluate(globalns, localns, recursive_guard=set())
        
        pydantic.typing.evaluate_forwardref = patched_evaluate_forwardref
        print("✅ Successfully patched Pydantic's evaluate_forwardref")
    else:
        print("⚠️ Pydantic's evaluate_forwardref function not found")
except ImportError:
    print("⚠️ Failed to import Pydantic module")

print("✓ Pydantic compatibility patches applied") 