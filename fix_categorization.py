#!/usr/bin/env python3
"""
Fix categorization system in scenario files.
Changes "Soft Resistance" choices with evs_score: -1 to "Compliance"
"""

import json
import os
import glob

def fix_scenario_file(filepath):
    """Fix categorization in a single scenario file"""
    print(f"Processing {filepath}...")
    
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    changes_made = 0
    
    # Process all statements
    if 'statements' in data:
        for statement_id, statement in data['statements'].items():
            if 'user_choices' in statement:
                for choice in statement['user_choices']:
                    # Fix: Soft Resistance with evs_score -1 → Compliance
                    if (choice.get('tactic_type') == 'Soft Resistance' and 
                        choice.get('evs_score') == -1):
                        choice['tactic_type'] = 'Compliance'
                        changes_made += 1
                        print(f"  Fixed choice: {choice.get('choice', '')[:50]}...")
    
    if changes_made > 0:
        # Write back to file
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"  ✅ Made {changes_made} changes")
    else:
        print(f"  ℹ️  No changes needed")
    
    return changes_made

def main():
    """Main function to fix all scenario files"""
    scenario_dir = "backend/src/main/resources/scenarios"
    
    # Get all main scenario files (exclude backup folders)
    pattern = os.path.join(scenario_dir, "*.json")
    scenario_files = glob.glob(pattern)
    
    total_changes = 0
    
    print("🔧 Fixing categorization system in scenarios...")
    print("📋 Changing: 'Soft Resistance' + evs_score:-1 → 'Compliance'")
    print()
    
    for filepath in sorted(scenario_files):
        changes = fix_scenario_file(filepath)
        total_changes += changes
        print()
    
    print(f"✅ Complete! Made {total_changes} total changes across {len(scenario_files)} files")
    print()
    print("📊 Correct categorization system:")
    print("  • Rhetorical Tactics: +1 EVS (advocacy)")
    print("  • Soft Resistance: +1 EVS (advocacy)")  
    print("  • Logical Fallacies: 0 EVS (neutral)")
    print("  • Compliance: -1 EVS (triggers off-ramp)")

if __name__ == "__main__":
    main() 