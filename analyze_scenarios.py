#!/usr/bin/env python3
"""
Scenario Structure Analyzer
Analyzes all scenario JSON files to understand their ending mechanisms
"""

import json
import os
from pathlib import Path

def analyze_scenario(file_path):
    """Analyze a single scenario file"""
    print(f"\n{'='*60}")
    print(f"ANALYZING: {file_path.name}")
    print(f"{'='*60}")
    
    with open(file_path, 'r') as f:
        scenario = json.load(f)
    
    # Basic info
    print(f"ID: {scenario.get('id')}")
    print(f"Title: {scenario.get('title')}")
    print(f"Manager Type: {scenario.get('managerType')}")
    
    # Analyze statements
    statements = scenario.get('statements', {})
    print(f"\nSTATEMENTS COUNT: {len(statements)}")
    
    # Find statement types
    regular_statements = []
    ending_statements = []
    special_statements = []
    
    for stmt_id, stmt_data in statements.items():
        if stmt_id.startswith('end'):
            ending_statements.append(stmt_id)
        elif stmt_id in ['final_score', 'score']:
            special_statements.append(stmt_id)
        else:
            regular_statements.append(stmt_id)
    
    print(f"Regular statements: {len(regular_statements)}")
    print(f"Ending statements: {len(ending_statements)}")
    print(f"Special statements: {len(special_statements)}")
    
    if ending_statements:
        print(f"Ending statement IDs: {ending_statements}")
    if special_statements:
        print(f"Special statement IDs: {special_statements}")
    
    # Analyze endings section
    endings = scenario.get('endings', {})
    print(f"\nENDINGS SECTION COUNT: {len(endings)}")
    if endings:
        print(f"Ending IDs: {list(endings.keys())}")
    
    # Analyze final_score or score statement
    final_score_stmt = statements.get('final_score') or statements.get('score')
    if final_score_stmt:
        print(f"\nFINAL SCORE STATEMENT:")
        print(f"Has text: {'text' in final_score_stmt}")
        print(f"Has user_choices: {'user_choices' in final_score_stmt}")
        if 'user_choices' in final_score_stmt:
            print(f"User choices count: {len(final_score_stmt['user_choices'])}")
        print(f"Has score_ranges: {'score_ranges' in final_score_stmt}")
        if 'score_ranges' in final_score_stmt:
            score_ranges = final_score_stmt['score_ranges']
            print(f"Score ranges: {dict(score_ranges)}")
    
    # Trace flow to endings
    print(f"\nFLOW ANALYSIS:")
    
    # Find paths to endings
    paths_to_endings = []
    
    def trace_paths(stmt_id, path, visited=None):
        if visited is None:
            visited = set()
        
        if stmt_id in visited:
            return  # Avoid infinite loops
        
        visited.add(stmt_id)
        
        stmt = statements.get(stmt_id)
        if not stmt:
            if stmt_id.startswith('end') or stmt_id in ['final_score', 'score']:
                paths_to_endings.append(path + [stmt_id])
            return
        
        user_choices = stmt.get('user_choices', [])
        for i, choice in enumerate(user_choices):
            leads_to = choice.get('leads_to')
            if leads_to:
                trace_paths(leads_to, path + [f"{stmt_id}->choice{i}"], visited.copy())
    
    # Start tracing from intro
    trace_paths('intro', [])
    
    print(f"Found {len(paths_to_endings)} paths to endings:")
    for i, path in enumerate(paths_to_endings[:5]):  # Show first 5 paths
        print(f"  Path {i+1}: {' -> '.join(path)}")
    
    if len(paths_to_endings) > 5:
        print(f"  ... and {len(paths_to_endings) - 5} more paths")
    
    # Count typical scenario length
    if paths_to_endings:
        path_lengths = [len([p for p in path if '->' in p]) for path in paths_to_endings]
        avg_length = sum(path_lengths) / len(path_lengths)
        print(f"Average path length (choices): {avg_length:.1f}")
        print(f"Path length range: {min(path_lengths)} - {max(path_lengths)} choices")

def main():
    """Analyze all scenario files"""
    scenarios_dir = Path("backend/src/main/resources/scenarios")
    
    if not scenarios_dir.exists():
        print(f"Scenarios directory not found: {scenarios_dir}")
        return
    
    scenario_files = list(scenarios_dir.glob("*.json"))
    
    print(f"Found {len(scenario_files)} scenario files:")
    for file in scenario_files:
        print(f"  - {file.name}")
    
    # Analyze each scenario
    for scenario_file in sorted(scenario_files):
        analyze_scenario(scenario_file)
    
    # Summary comparison
    print(f"\n{'='*60}")
    print("SUMMARY COMPARISON")
    print(f"{'='*60}")
    
    summary_data = {}
    
    for scenario_file in sorted(scenario_files):
        with open(scenario_file, 'r') as f:
            scenario = json.load(f)
        
        statements = scenario.get('statements', {})
        endings = scenario.get('endings', {})
        
        # Check for final_score/score
        has_final_score = 'final_score' in statements
        has_score = 'score' in statements
        final_score_stmt = statements.get('final_score') or statements.get('score')
        has_score_ranges = final_score_stmt and 'score_ranges' in final_score_stmt
        
        # Check ending types
        ending_stmt_ids = [k for k in statements.keys() if k.startswith('end')]
        
        summary_data[scenario_file.name] = {
            'statements_count': len(statements),
            'endings_count': len(endings),
            'has_final_score': has_final_score,
            'has_score': has_score,
            'has_score_ranges': has_score_ranges,
            'ending_statements': ending_stmt_ids,
            'ending_section_keys': list(endings.keys())
        }
    
    # Print comparison table
    print(f"{'Scenario':<25} {'Stmts':<6} {'Ends':<6} {'FinalScore':<11} {'ScoreRanges':<12} {'EndingStmts':<15} {'EndingKeys'}")
    print("-" * 100)
    
    for filename, data in summary_data.items():
        name = filename.replace('.json', '').replace('_', ' ')[:24]
        stmts = str(data['statements_count'])
        ends = str(data['endings_count'])
        final_score = 'final_score' if data['has_final_score'] else 'score' if data['has_score'] else 'None'
        score_ranges = 'Yes' if data['has_score_ranges'] else 'No'
        ending_stmts = ','.join(data['ending_statements'])[:14] if data['ending_statements'] else 'None'
        ending_keys = ','.join(data['ending_section_keys'])[:20] if data['ending_section_keys'] else 'None'
        
        print(f"{name:<25} {stmts:<6} {ends:<6} {final_score:<11} {score_ranges:<12} {ending_stmts:<15} {ending_keys}")

if __name__ == "__main__":
    main() 