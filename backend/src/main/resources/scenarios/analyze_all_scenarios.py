#!/usr/bin/env python3
"""
Comprehensive Scenario Analysis Script
Analyzes all scenario files for structure, connections, and inconsistencies
"""

import json
import os
import re
from collections import defaultdict, Counter

def load_scenario(filename):
    """Load and parse a scenario JSON file"""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return None

def analyze_structure(data, scenario_name):
    """Analyze the structure of a scenario"""
    if not data or 'statements' not in data:
        return {"error": "Invalid scenario structure"}
    
    statements = data['statements']
    structure = defaultdict(int)
    
    # Count nodes by step
    for node_name in statements.keys():
        if node_name == "initial":
            structure["step_1"] += 1
        else:
            # Extract step number
            match = re.match(r'step_(\d+)', node_name)
            if match:
                step_num = int(match.group(1))
                structure[f"step_{step_num}"] += 1
    
    return dict(structure)

def analyze_connections(data, scenario_name):
    """Analyze connections and find issues"""
    if not data or 'statements' not in data:
        return {"error": "Invalid scenario structure"}
    
    statements = data['statements']
    all_nodes = set(statements.keys())
    leads_to_refs = []
    broken_refs = []
    duplicate_targets = defaultdict(list)
    
    # Collect all leads_to references
    for node_name, node_data in statements.items():
        if 'user_choices' in node_data:
            for choice in node_data['user_choices']:
                if 'leads_to' in choice:
                    target = choice['leads_to']
                    leads_to_refs.append(target)
                    duplicate_targets[target].append(node_name)
                    
                    # Check if target exists
                    if target not in all_nodes:
                        broken_refs.append({
                            'from': node_name,
                            'to': target,
                            'choice': choice.get('choice', 'N/A')[:50] + '...'
                        })
    
    # Find duplicates (targets with multiple sources)
    duplicates = {target: sources for target, sources in duplicate_targets.items() 
                  if len(sources) > 1}
    
    return {
        'total_references': len(leads_to_refs),
        'unique_targets': len(set(leads_to_refs)),
        'broken_references': broken_refs,
        'duplicate_targets': duplicates,
        'broken_count': len(broken_refs),
        'duplicate_count': len(duplicates)
    }

def validate_tactic_types(data, scenario_name):
    """Validate tactic types consistency"""
    if not data or 'statements' not in data:
        return {"error": "Invalid scenario structure"}
    
    statements = data['statements']
    tactic_types = Counter()
    missing_tactics = []
    
    for node_name, node_data in statements.items():
        if 'user_choices' in node_data:
            for i, choice in enumerate(node_data['user_choices']):
                if 'tactic_type' in choice:
                    tactic_types[choice['tactic_type']] += 1
                else:
                    missing_tactics.append(f"{node_name}[{i}]")
    
    return {
        'tactic_distribution': dict(tactic_types),
        'missing_tactics': missing_tactics,
        'total_choices': sum(tactic_types.values()),
        'unique_tactics': len(tactic_types)
    }

def check_evs_scores(data, scenario_name):
    """Check EVS score distribution and validity"""
    if not data or 'statements' not in data:
        return {"error": "Invalid scenario structure"}
    
    statements = data['statements']
    evs_scores = Counter()
    missing_evs = []
    invalid_evs = []
    
    for node_name, node_data in statements.items():
        if 'user_choices' in node_data:
            for i, choice in enumerate(node_data['user_choices']):
                if 'evs_score' in choice:
                    score = choice['evs_score']
                    evs_scores[score] += 1
                    if score not in [-1, 0, 1]:
                        invalid_evs.append(f"{node_name}[{i}]: {score}")
                else:
                    missing_evs.append(f"{node_name}[{i}]")
    
    return {
        'score_distribution': dict(evs_scores),
        'missing_scores': missing_evs,
        'invalid_scores': invalid_evs,
        'total_choices': sum(evs_scores.values())
    }

def analyze_diamond_structure(structure):
    """Check if structure follows diamond pattern"""
    expected_diamond = {
        'step_1': 1,
        'step_2': 4, 
        'step_3': 16,
        'step_4': 64,
        'step_5': 32,
        'step_6': 16,
        'step_7': 8,
        'step_8': 4
    }
    
    analysis = {}
    total_expected = sum(expected_diamond.values())
    total_actual = sum(structure.values())
    
    for step, expected_count in expected_diamond.items():
        actual_count = structure.get(step, 0)
        status = "✅" if actual_count == expected_count else "❌"
        analysis[step] = {
            'expected': expected_count,
            'actual': actual_count,
            'status': status,
            'difference': actual_count - expected_count
        }
    
    return {
        'step_analysis': analysis,
        'total_expected': total_expected,
        'total_actual': total_actual,
        'completion_rate': (total_actual / total_expected) * 100 if total_expected > 0 else 0
    }

def main():
    scenario_files = [
        'accessibility_camouflager.json',
        'accessibility_diluter.json', 
        'accessibility_puppeteer.json',
        'privacy_camouflager.json',
        'privacy_diluter.json',
        'privacy_puppeteer.json'
    ]
    
    print("=" * 80)
    print("COMPREHENSIVE SCENARIO ANALYSIS")
    print("=" * 80)
    
    all_results = {}
    
    for filename in scenario_files:
        if not os.path.exists(filename):
            print(f"\n❌ File not found: {filename}")
            continue
            
        print(f"\n{'='*60}")
        print(f"ANALYZING: {filename.upper()}")
        print(f"{'='*60}")
        
        data = load_scenario(filename)
        if not data:
            continue
            
        scenario_name = filename.replace('.json', '')
        
        # Structure Analysis
        structure = analyze_structure(data, scenario_name)
        print(f"\n📊 STRUCTURE ANALYSIS:")
        for step, count in sorted(structure.items()):
            print(f"   {step}: {count} nodes")
        
        # Diamond Structure Check
        diamond_analysis = analyze_diamond_structure(structure)
        print(f"\n💎 DIAMOND STRUCTURE CHECK:")
        print(f"   Completion: {diamond_analysis['completion_rate']:.1f}% ({diamond_analysis['total_actual']}/{diamond_analysis['total_expected']})")
        for step, info in diamond_analysis['step_analysis'].items():
            print(f"   {step}: {info['status']} {info['actual']}/{info['expected']} (diff: {info['difference']:+d})")
        
        # Connection Analysis
        connections = analyze_connections(data, scenario_name)
        print(f"\n🔗 CONNECTION ANALYSIS:")
        print(f"   Total references: {connections['total_references']}")
        print(f"   Unique targets: {connections['unique_targets']}")
        print(f"   Broken references: {connections['broken_count']}")
        print(f"   Duplicate targets: {connections['duplicate_count']}")
        
        if connections['broken_count'] > 0:
            print(f"\n   🚨 BROKEN REFERENCES (first 5):")
            for ref in connections['broken_references'][:5]:
                print(f"      {ref['from']} -> {ref['to']}")
        
        if connections['duplicate_count'] > 0:
            print(f"\n   ⚠️  DUPLICATE TARGETS (first 5):")
            for target, sources in list(connections['duplicate_targets'].items())[:5]:
                print(f"      {target}: {len(sources)} sources")
        
        # Tactic Type Analysis
        tactics = validate_tactic_types(data, scenario_name)
        print(f"\n🎯 TACTIC TYPE ANALYSIS:")
        print(f"   Total choices: {tactics['total_choices']}")
        print(f"   Unique tactics: {tactics['unique_tactics']}")
        print(f"   Missing tactics: {len(tactics['missing_tactics'])}")
        
        # EVS Score Analysis
        evs = check_evs_scores(data, scenario_name)
        print(f"\n📈 EVS SCORE ANALYSIS:")
        print(f"   Total choices: {evs['total_choices']}")
        print(f"   Score distribution: {evs['score_distribution']}")
        print(f"   Missing scores: {len(evs['missing_scores'])}")
        print(f"   Invalid scores: {len(evs['invalid_scores'])}")
        
        # Store results
        all_results[scenario_name] = {
            'structure': structure,
            'diamond_analysis': diamond_analysis,
            'connections': connections,
            'tactics': tactics,
            'evs': evs
        }
    
    # Summary Report
    print(f"\n{'='*80}")
    print("SUMMARY REPORT")
    print(f"{'='*80}")
    
    for scenario_name, results in all_results.items():
        diamond = results['diamond_analysis']
        connections = results['connections']
        print(f"\n{scenario_name.upper()}:")
        print(f"   Structure: {diamond['completion_rate']:.1f}% complete ({diamond['total_actual']}/{diamond['total_expected']})")
        print(f"   Connections: {connections['broken_count']} broken, {connections['duplicate_count']} duplicates")
        print(f"   Status: {'✅ COMPLETE' if diamond['completion_rate'] == 100 and connections['broken_count'] == 0 else '❌ NEEDS WORK'}")

if __name__ == "__main__":
    main() 