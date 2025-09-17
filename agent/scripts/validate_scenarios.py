import json
from pathlib import Path

# The final, master list of 30 approved tactics.
APPROVED_TACTICS = {
    'Broadening Who the "User" is in User Research',
    "Designing Affordances Subversively",
    "Making Values Visible Rhetorically to Other Organizational Stakeholders",
    "Expanding On and Subverting Design Resources for Others",
    "Making Values Visible and Legible Through Organizational Metrics",
    "Using Organizational Values to Create Spaces for New Forms of Values Work",
    "Guerilla methods",
    "Models that synthesize",
    "Usability studies",
    "Embodied knowledge of users",
    "Fidelity as a rhetorical strategy",
    "Envisioning",
    "Heuristics",
    "Credibility and expertise",
    "Organizational memory",
    "Usable enough",
    "Distract and pacify",
    "Acquiesce",
    "Negotiation and cooperation",
    "Being the user",
    "Compliance",
    # Logical Fallacies (9)
    "False Dilemma",
    "Appeal to Ignorance",
    "Appeal to Popularity",
    "Strawman",
    "Red Herring",
    "Slippery Slope",
    "Appeal to Authority",
    "Hasty Generalization",
    "Circular Reasoning",
}

def get_all_used_tactics(scenarios_dir):
    """
    Extracts all unique tactic strings from the scenario JSON files.
    Also checks for JSON validity.
    """
    used_tactics = set()
    invalid_files = []
    
    scenario_files = list(scenarios_dir.rglob('*.json'))

    for file_path in scenario_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            statements = data.get("statements", {})
            for _, content in statements.items():
                for choice in content.get("user_choices", []):
                    if tactic := choice.get("tactic"):
                        used_tactics.add(tactic)
        except json.JSONDecodeError as e:
            invalid_files.append({"file": file_path.name, "error": str(e)})
            continue
            
    return used_tactics, invalid_files

def main():
    """
    Runs a comprehensive validation on all scenario files.
    """
    project_root = Path(__file__).resolve().parent.parent.parent
    scenarios_dir = project_root / 'backend' / 'src' / 'main' / 'resources' / 'scenarios'
    
    print("=" * 70)
    print("Starting Comprehensive Scenario Validation")
    print(f"Scanning directory: {scenarios_dir}")
    print("=" * 70)
    
    used_tactics, invalid_files = get_all_used_tactics(scenarios_dir)
    
    # 1. Check for JSON formatting errors
    print("\n[1] Checking JSON file format...")
    if invalid_files:
        print("  - [!] ERROR: Found files with JSON formatting issues:")
        for issue in invalid_files:
            print(f"    - File: {issue['file']}, Error: {issue['error']}")
    else:
        print("  - [✓] All scenario files are formatted correctly.")
        
    # 2. Check for unapproved tactics
    print("\n[2] Checking for unapproved tactics...")
    unapproved_used = used_tactics - APPROVED_TACTICS
    if unapproved_used:
        print("  - [!] ERROR: The following tactics are USED but NOT APPROVED:")
        for tactic in sorted(list(unapproved_used)):
            print(f"    - '{tactic}'")
    else:
        print("  - [✓] All tactics used in files are on the approved list.")
        
    # 3. Check for unused approved tactics
    print("\n[3] Checking for unused approved tactics...")
    unused_approved = APPROVED_TACTICS - used_tactics
    if unused_approved:
        print("  - [i] INFO: The following APPROVED tactics are NOT USED in any files:")
        for tactic in sorted(list(unused_approved)):
            print(f"    - '{tactic}'")
    else:
        print("  - [✓] All approved tactics are being used.")
        
    print("\n" + "=" * 70)
    if not unapproved_used and not invalid_files:
        print("Validation Successful: All checks passed.")
    else:
        print("Validation Failed: Please address the errors listed above.")
    print("=" * 70)


if __name__ == "__main__":
    main() 