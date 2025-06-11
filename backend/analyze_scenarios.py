import json
import os
from pathlib import Path

def analyze_scenario_file(file_path):
    """
    Analyzes a single scenario JSON file for inconsistencies, broken links,
    and other potential issues.
    """
    report = {
        "file": str(file_path),
        "errors": [],
        "warnings": []
    }

    try:
        # Use a custom object_pairs_hook to detect duplicate keys
        with file_path.open('r', encoding='utf-8') as f:
            content_str = f.read()
            # This will fail on duplicate keys in the same JSON object
            data = json.loads(content_str, object_pairs_hook=lambda pairs: check_for_duplicates(pairs, report))
    except json.JSONDecodeError as e:
        report["errors"].append(f"Invalid JSON: {e}")
        return report
    except ValueError as e:
        # This catches our custom duplicate key error
        report["errors"].append(str(e))
        # We can still try to analyze the file with duplicates ignored
        try:
            data = json.loads(content_str)
        except json.JSONDecodeError:
            return report # Return early if it's fundamentally broken

    # 1. Check for required top-level keys
    required_keys = ["id", "title", "description", "issue", "manager_type", "starting_statement_id", "statements"]
    for key in required_keys:
        if key not in data:
            report["errors"].append(f"Missing required top-level key: '{key}'")

    # If fundamental keys are missing, further analysis is unreliable
    if "id" not in data or "statements" not in data or "starting_statement_id" not in data:
        return report

    # 2. Check if file ID matches content ID
    filename_id = file_path.stem
    if data.get("id") != filename_id:
        report["errors"].append(f"File name '{filename_id}' does not match content 'id': '{data.get('id')}'")

    statements = data.get("statements", {})
    if not isinstance(statements, dict):
        report["errors"].append("'statements' is not a valid dictionary.")
        return report

    all_statement_ids = set(statements.keys())
    all_leads_to_ids = set()

    # 3. Validate starting statement ID
    starting_statement_id = data.get("starting_statement_id")
    if starting_statement_id not in all_statement_ids:
        report["errors"].append(f"The 'starting_statement_id' '{starting_statement_id}' does not exist in statements.")

    # 4. Analyze each statement for connectivity
    for statement_id, statement_content in statements.items():
        if not isinstance(statement_content, dict):
            report["errors"].append(f"Statement '{statement_id}' content is not a valid dictionary.")
            continue
            
        user_choices = statement_content.get("user_choices")
        if user_choices is None:
            report["warnings"].append(f"Statement '{statement_id}' has no 'user_choices' key. This could be an intended end point.")
            continue # This statement is a leaf node

        if not isinstance(user_choices, list):
             report["errors"].append(f"In statement '{statement_id}', 'user_choices' is not a list.")
             continue

        if not user_choices and statement_id != "scenario_end":
            # This is a valid end state, like an ethical victory.
            pass

        leads_to_in_statement = []
        for i, choice in enumerate(user_choices):
            if not isinstance(choice, dict):
                report["errors"].append(f"In statement '{statement_id}', a choice at index {i} is not a valid dictionary.")
                continue

            leads_to = choice.get("leads_to")
            leads_to_in_statement.append(leads_to)

            if not leads_to:
                report["errors"].append(f"In statement '{statement_id}', choice {i} is missing a 'leads_to' key.")
            else:
                all_leads_to_ids.add(leads_to)
                if leads_to not in all_statement_ids and leads_to != "scenario_end":
                    report["errors"].append(f"Broken link: Statement '{statement_id}', choice {i} leads to non-existent statement '{leads_to}'.")

        if len(leads_to_in_statement) != len(set(leads_to_in_statement)):
            report["warnings"].append(f"Statement '{statement_id}' has duplicate 'leads_to' targets in its choices.")

    # 5. Find orphaned statements
    reachable_ids = all_leads_to_ids.union({starting_statement_id})
    orphaned_ids = all_statement_ids - reachable_ids
    if orphaned_ids:
        for orphan_id in orphaned_ids:
            report["warnings"].append(f"Orphaned statement: '{orphan_id}' is defined but never linked to.")

    return report

def check_for_duplicates(pairs, report):
    """
    A hook for json.loads to detect duplicate keys in JSON objects.
    Raises a ValueError if a duplicate is found.
    """
    keys = {}
    for key, value in pairs:
        if key in keys:
            # Found a duplicate key, report it and raise an error
            error_msg = f"Duplicate key found in JSON object: '{key}'"
            raise ValueError(error_msg)
        # Check for duplicates in nested statements
        if key == "statements" and isinstance(value, list):
             # This handles the case where statements might be a list of dicts
             for i, item in enumerate(value):
                 if isinstance(item, dict):
                    # We can't use the hook recursively easily, but we can do a manual check
                    pass # Deferring to main logic for now
        keys[key] = value
    return keys


def main():
    """
    Main function to find and analyze all scenario files.
    """
    scenarios_dir = Path(__file__).parent / "src/main/resources/scenarios"
    if not scenarios_dir.exists():
        print(f"Error: Directory not found: {scenarios_dir}")
        return

    print(f"Analyzing scenario files in: {scenarios_dir}\n")

    has_issues = False
    for json_file in sorted(scenarios_dir.glob("*.json")):
        report = analyze_scenario_file(json_file)
        
        if report["errors"] or report["warnings"]:
            has_issues = True
            print(f"--- Report for {json_file.name} ---")
            if report["errors"]:
                print("Errors (must be fixed):")
                for error in report["errors"]:
                    print(f"  - {error}")
            if report["warnings"]:
                print("Warnings (should be reviewed):")
                for warning in report["warnings"]:
                    print(f"  - {warning}")
            print("-" * (len(json_file.name) + 14))
            print()

    if not has_issues:
        print("All scenario files analyzed. No issues found. Great job!")

if __name__ == "__main__":
    main() 