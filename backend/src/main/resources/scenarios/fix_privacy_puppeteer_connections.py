#!/usr/bin/env python3
"""
Privacy Puppeteer Connection Fix Script
Systematically fixes all broken leads_to references and duplicate targets
"""

import json
import re
from collections import defaultdict

def load_scenario(filename):
    """Load scenario JSON file"""
    with open(filename, 'r') as f:
        return json.load(f)

def save_scenario(filename, data):
    """Save scenario JSON file with proper formatting"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def analyze_broken_connections(statements):
    """Find all broken connections and existing nodes"""
    all_nodes = set(statements.keys())
    broken_refs = []
    duplicate_targets = defaultdict(list)
    
    # Collect all leads_to references
    for node_name, node_data in statements.items():
        if 'user_choices' in node_data:
            for i, choice in enumerate(node_data['user_choices']):
                if 'leads_to' in choice:
                    target = choice['leads_to']
                    duplicate_targets[target].append((node_name, i))
                    
                    # Check if target exists
                    if target not in all_nodes:
                        broken_refs.append({
                            'from_node': node_name,
                            'choice_idx': i,
                            'broken_target': target,
                            'choice_text': choice.get('choice', '')[:50]
                        })
    
    # Find actual duplicates (targets with multiple sources)
    actual_duplicates = {target: sources for target, sources in duplicate_targets.items() 
                        if len(sources) > 1}
    
    return broken_refs, actual_duplicates, all_nodes

def extract_step_info(node_name):
    """Extract step number and category from node name"""
    if node_name == "initial":
        return 1, "initial", ""
    
    match = re.match(r'step_(\d+)_(.+)', node_name)
    if match:
        step_num = int(match.group(1))
        category = match.group(2)
        return step_num, category, node_name
    return None, None, node_name

def find_best_match(broken_target, existing_nodes, from_node):
    """Find best matching existing node for broken target"""
    from_step, from_category, _ = extract_step_info(from_node)
    
    if not from_step:
        return None
    
    # Target should typically be next step
    target_step = from_step + 1
    
    # If target step > 8, wrap to final nodes
    if target_step > 8:
        target_step = 8
    
    # Try to find nodes with similar naming patterns
    candidates = []
    for node in existing_nodes:
        node_step, node_category, _ = extract_step_info(node)
        if node_step == target_step:
            candidates.append(node)
    
    if not candidates:
        # Fallback: find any node in target step
        for node in existing_nodes:
            if node.startswith(f'step_{target_step}_'):
                candidates.append(node)
    
    if not candidates:
        return None
    
    # Try to match by category/theme
    broken_parts = broken_target.lower().split('_')
    best_match = None
    best_score = 0
    
    for candidate in candidates:
        candidate_parts = candidate.lower().split('_')
        score = len(set(broken_parts) & set(candidate_parts))
        if score > best_score:
            best_score = score
            best_match = candidate
    
    return best_match if best_match else candidates[0]

def create_step_mapping(existing_nodes):
    """Create mapping of nodes by step for systematic routing"""
    step_mapping = defaultdict(list)
    
    for node in existing_nodes:
        step_num, category, _ = extract_step_info(node)
        if step_num:
            step_mapping[step_num].append(node)
    
    return step_mapping

def fix_broken_connections(statements, broken_refs, existing_nodes):
    """Fix all broken connections systematically"""
    step_mapping = create_step_mapping(existing_nodes)
    
    # Create round-robin indices for each step to distribute connections
    step_indices = {step: 0 for step in step_mapping.keys()}
    
    fixes_made = 0
    
    for ref in broken_refs:
        from_node = ref['from_node']
        choice_idx = ref['choice_idx']
        broken_target = ref['broken_target']
        
        # Find best replacement
        best_match = find_best_match(broken_target, existing_nodes, from_node)
        
        if best_match:
            # Apply the fix
            statements[from_node]['user_choices'][choice_idx]['leads_to'] = best_match
            fixes_made += 1
            print(f"Fixed: {from_node}[{choice_idx}] -> {broken_target} => {best_match}")
        else:
            print(f"Could not fix: {from_node}[{choice_idx}] -> {broken_target}")
    
    return fixes_made

def resolve_duplicate_targets(statements, duplicates):
    """Resolve duplicate target issues by creating better distribution"""
    fixes_made = 0
    
    for target, sources in duplicates.items():
        if len(sources) <= 2:  # Allow some duplicates for convergence
            continue
            
        print(f"\nResolving {len(sources)} duplicates for target: {target}")
        
        # Keep first two sources, redirect others
        target_step, _, _ = extract_step_info(target)
        
        if target_step:
            # Find alternative targets in same step
            alternative_targets = []
            for node in statements.keys():
                node_step, _, _ = extract_step_info(node)
                if node_step == target_step and node != target:
                    alternative_targets.append(node)
            
            # Redistribute excess sources
            for i, (source_node, choice_idx) in enumerate(sources[2:], 2):
                if alternative_targets:
                    new_target = alternative_targets[i % len(alternative_targets)]
                    statements[source_node]['user_choices'][choice_idx]['leads_to'] = new_target
                    fixes_made += 1
                    print(f"  Redirected: {source_node}[{choice_idx}] -> {target} => {new_target}")
    
    return fixes_made

def validate_connections(statements):
    """Validate all connections after fixes"""
    all_nodes = set(statements.keys())
    broken_count = 0
    total_refs = 0
    
    for node_name, node_data in statements.items():
        if 'user_choices' in node_data:
            for choice in node_data['user_choices']:
                if 'leads_to' in choice:
                    total_refs += 1
                    target = choice['leads_to']
                    if target not in all_nodes:
                        broken_count += 1
    
    return broken_count, total_refs

def main():
    filename = 'privacy_puppeteer.json'
    
    print("=" * 80)
    print("PRIVACY PUPPETEER CONNECTION FIX")
    print("=" * 80)
    
    # Load scenario
    print(f"Loading {filename}...")
    data = load_scenario(filename)
    statements = data['statements']
    
    # Analyze current state
    print("\nAnalyzing current connections...")
    broken_refs, duplicates, existing_nodes = analyze_broken_connections(statements)
    
    print(f"Found:")
    print(f"  - {len(existing_nodes)} existing nodes")
    print(f"  - {len(broken_refs)} broken references")
    print(f"  - {len(duplicates)} duplicate targets")
    
    # Create backup
    backup_filename = filename.replace('.json', '_backup.json')
    print(f"\nCreating backup: {backup_filename}")
    save_scenario(backup_filename, data)
    
    # Fix broken connections
    print(f"\nFixing {len(broken_refs)} broken connections...")
    broken_fixes = fix_broken_connections(statements, broken_refs, existing_nodes)
    
    # Resolve duplicates
    print(f"\nResolving {len(duplicates)} duplicate targets...")
    duplicate_fixes = resolve_duplicate_targets(statements, duplicates)
    
    # Validate results
    print("\nValidating connections...")
    final_broken, total_refs = validate_connections(statements)
    
    # Save fixed version
    save_scenario(filename, data)
    
    # Summary
    print("\n" + "=" * 80)
    print("FIX SUMMARY")
    print("=" * 80)
    print(f"Broken connection fixes: {broken_fixes}")
    print(f"Duplicate resolution fixes: {duplicate_fixes}")
    print(f"Total references: {total_refs}")
    print(f"Remaining broken: {final_broken}")
    print(f"Success rate: {((total_refs - final_broken) / total_refs * 100):.1f}%")
    
    if final_broken == 0:
        print("\n🎉 ALL CONNECTIONS FIXED! Privacy Puppeteer is now fully functional!")
    else:
        print(f"\n⚠️  {final_broken} connections still need manual review")
    
    print(f"\nOriginal file backed up as: {backup_filename}")
    print(f"Fixed file saved as: {filename}")

if __name__ == "__main__":
    main() 