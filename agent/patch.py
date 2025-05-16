"""
Patch script for fixing Pydantic ForwardRef._evaluate issue with Python 3.12
This patch handles the recursive_guard parameter properly when Python 3.12 passes it.
"""

import inspect
import typing
from typing import Any, ForwardRef

# Store original _evaluate method
original_evaluate = ForwardRef._evaluate

# Inspect the number of parameters the original method accepts
sig = inspect.signature(original_evaluate)
param_count = len(sig.parameters)

def patched_evaluate(self, globalns, localns, *args, **kwargs):
    """
    Patched _evaluate method that correctly handles the recursive_guard parameter
    for both Python 3.12 (which passes it) and earlier versions (which don't).
    
    This wrapper properly handles both positional and keyword arguments.
    """
    # For Python 3.12, typing._eval_type calls this with 4 parameters:
    # _evaluate(globalns, localns, type_params, recursive_guard=recursive_guard)
    # We need to ensure we don't pass recursive_guard twice

    # If we got both positional and keyword recursive_guard, handle it
    if 'recursive_guard' in kwargs and len(args) >= 1:
        # Use just the keyword argument, ignoring the positional one
        return original_evaluate(self, globalns, localns, kwargs['recursive_guard'])
    
    # Otherwise, forward all arguments as received
    try:
        return original_evaluate(self, globalns, localns, *args, **kwargs)
    except TypeError as e:
        # If it fails because recursive_guard wasn't expected, try without it
        if "got an unexpected keyword argument 'recursive_guard'" in str(e):
            # Remove recursive_guard from kwargs and try again
            kwargs_copy = kwargs.copy()
            if 'recursive_guard' in kwargs_copy:
                del kwargs_copy['recursive_guard']
            return original_evaluate(self, globalns, localns, *args, **kwargs_copy)
        # For any other errors, let them propagate
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
            # Call patched _evaluate which handles recursive_guard properly
            return type_._evaluate(globalns, localns)
        
        pydantic.typing.evaluate_forwardref = patched_evaluate_forwardref
        print("✅ Successfully patched Pydantic's evaluate_forwardref")
    else:
        print("⚠️ Pydantic's evaluate_forwardref function not found")
except ImportError:
    print("⚠️ Failed to import Pydantic module")

print("✓ Pydantic compatibility patches applied") 