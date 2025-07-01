#!/usr/bin/env python3
"""
Fix categorization system in privacy_puppeteer.json
"""

import json
import re

def fix_categorization_and_balance():
    filepath = "backend/src/main/resources/scenarios/privacy_puppeteer.json"
    
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    changes_made = 0
    
    # Step 1: Fix all Soft Resistance choices with -1 EVS to Compliance
    print("🔧 Step 1: Fixing Soft Resistance with -1 EVS → Compliance")
    
    if 'statements' in data:
        for statement_id, statement in data['statements'].items():
            if 'user_choices' in statement:
                for choice in statement['user_choices']:
                    if (choice.get('tactic_type') == 'Soft Resistance' and 
                        choice.get('evs_score') == -1):
                        choice['tactic'] = 'Compliance'
                        choice['tactic_type'] = 'Compliance'
                        changes_made += 1
                        print(f"  Fixed: {choice.get('choice', '')[:50]}...")
    
    # Step 2: Fix main steps to have proper balance
    print("\n🔧 Step 2: Fixing balance in main steps")
    
    main_steps = ['step_1', 'step_2', 'step_3', 'step_4', 'step_5']
    
    # Convert specific Rhetorical Tactics to Soft Resistance for balance
    conversions = {
        'step_4': 'Envisioning',  # Only need to fix step_4 now
    }
    
    for step_id in main_steps:
        if step_id in data['statements'] and step_id in conversions:
            statement = data['statements'][step_id]
            choices = statement.get('user_choices', [])
            target_tactic = conversions[step_id]
            
            for choice in choices:
                if (choice.get('tactic_type') == 'Rhetorical Tactics' and 
                    choice.get('tactic') == target_tactic):
                    
                    # Convert to Soft Resistance with appropriate choice text for privacy context
                    if step_id == 'step_4':
                        choice['choice'] = "I won't compromise on basic privacy - this isn't about being difficult, it's about our values."
                        choice['tactic'] = "Standing firm"
                        choice['justification'] = "Refuses to compromise on fundamental values despite emotional pressure"
                    
                    choice['tactic_type'] = 'Soft Resistance'
                    changes_made += 1
                    print(f"  Converted to Soft Resistance in {step_id}: {choice['choice'][:50]}...")
                    break
    
    if changes_made > 0:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"\n✅ Made {changes_made} total changes to {filepath}")
        
        # Verify balance
        print("\n📊 Verifying balance:")
        for step_id in main_steps:
            if step_id in data['statements']:
                statement = data['statements'][step_id]
                choices = statement.get('user_choices', [])
                
                rhetorical = len([c for c in choices if c.get('tactic_type') == 'Rhetorical Tactics'])
                soft_resistance = len([c for c in choices if c.get('tactic_type') == 'Soft Resistance'])
                logical_fallacies = len([c for c in choices if c.get('tactic_type') == 'Logical Fallacies'])
                compliance = len([c for c in choices if c.get('tactic_type') == 'Compliance'])
                
                print(f"  {step_id}: R:{rhetorical} S:{soft_resistance} L:{logical_fallacies} C:{compliance}", end="")
                if rhetorical == 1 and soft_resistance == 1 and logical_fallacies == 1 and compliance == 1:
                    print(" ✅")
                else:
                    print(" ⚠️")
    else:
        print("ℹ️  No changes needed")

if __name__ == "__main__":
    fix_categorization_and_balance() 