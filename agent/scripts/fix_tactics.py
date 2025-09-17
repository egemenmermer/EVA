import json
from pathlib import Path

# Mapping of incorrect tactic names to their correct versions.
REPLACEMENT_MAP = {
    # Fix duplicated names from previous script run
    "Making Values Visible Rhetorically to Other Organizational Stakeholders to Other Organizational Stakeholders": "Making Values Visible Rhetorically to Other Organizational Stakeholders",
    "Using Organizational Values to Create Spaces for New Forms of Values Work to Create Spaces for New Forms of Values Work": "Using Organizational Values to Create Spaces for New Forms of Values Work",

    # Map generic resistance tactics to an approved one
    "Values-based persistence": "Using Organizational Values to Create Spaces for New Forms of Values Work",
    "Ethical resistance": "Using Organizational Values to Create Spaces for New Forms of Values Work",
    "Standing firm": "Using Organizational Values to Create Spaces for New Forms of Values Work",
    "Persistent advocacy": "Using Organizational Values to Create Spaces for New Forms of Values Work",

    # Correct shorter variations
    "Making Values Visible Through Metrics": "Making Values Visible and Legible Through Organizational Metrics",
    "Making Values Visible Rhetorically": "Making Values Visible Rhetorically to Other Organizational Stakeholders",
    "Using Organizational Values": "Using Organizational Values to Create Spaces for New Forms of Values Work",
    
    # Normalize quotes
    'Broadening Who the “User” is in User Research': 'Broadening Who the "User" is in User Research'
}

def fix_tactics_in_file(file_path):
    """
    Finds and replaces incorrect tactics in a single scenario JSON file using raw string replacement.

    Args:
        file_path (Path): The path to the JSON file.

    Returns:
        int: The number of replacements made in the file.
    """
    replacements_count = 0
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            original_content = content

        for old, new in REPLACEMENT_MAP.items():
            if old in content:
                content = content.replace(old, new)
                replacements_count += 1
                print(f"  Replaced '{old}' -> '{new}'")

        if replacements_count > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
    except Exception as e:
        print(f"Error processing file {file_path}: {e}")
        return 0
            
    return replacements_count

def main():
    """
    Main function to find and fix tactics in all scenario files.
    """
    project_root = Path(__file__).resolve().parent.parent.parent
    scenarios_dir = project_root / 'backend' / 'src' / 'main' / 'resources' / 'scenarios'
    
    print(f"Searching for scenario files in: {scenarios_dir}")
    
    scenario_files = list(scenarios_dir.glob('*.json'))
    
    if not scenario_files:
        print("No scenario files found.")
        return

    print("-" * 40)
    total_fixed = 0
    for file_path in scenario_files:
        print(f"Processing file: {file_path.name}")
        fixed_in_file = fix_tactics_in_file(file_path)
        if fixed_in_file > 0:
            print(f"  -> Fixed {fixed_in_file} instance(s) in {file_path.name}")
            total_fixed += fixed_in_file
        else:
            print(f"  -> No incorrect tactics found in {file_path.name}.")
        print("-" * 20)

    print(f"\nFinished processing. A total of {total_fixed} tactics were corrected.")

if __name__ == "__main__":
    main() 