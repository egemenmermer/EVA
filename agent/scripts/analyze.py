import json
import os
from pathlib import Path

# --- DEFINE YOUR OFFICIAL TACTICS AND FALLACIES HERE ---
# Based on the image and lists you provided.

# List 1: Rhetorical / Advocacy Tactics
APPROVED_RHETORICAL_TACTICS = {
    # From the table image
    "Broadening Who the User is in User Research",
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
    "Being the user",
    "Negotiation and cooperation", # Added from later designs
    # From your text list
    "Appeal to Consequences",
    "Appeal to Standards",
    "Appeal to Empathy",
    "Legal Compliance Anchor",
    "Precedent Reference",
    "Ethical Constraints",
    "Design Tradeoff Framing",
    "Technical Feasibility Framing",
    "User-Centered Framing",
    "Escalating to Review",
    "Risk Management Framing",
    "Appealing to Shared Values",
}

# List 2: Soft Resistance Tactics (as used by the user)
# We evolved this category to be positive user actions.
APPROVED_SOFT_RESISTANCE = {
    "Persistent advocacy",
    "Values-based persistence",
    "Ethical resistance",
    "Standing firm",
    "Moral courage",
    "Making Values Visible Rhetorically", # Overlaps, good to have
}

# List 3: Logical Fallacies (as used by the user)
APPROVED_LOGICAL_FALLACIES = {
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

# List 4: Compliance (as used by the user)
# This is a special category for -1 EVS choices.
APPROVED_COMPLIANCE = {
    "Compliance",
}


# Combine all approved tactics into a single set for easy checking
ALL_APPROVED_TACTICS = (
    APPROVED_RHETORICAL_TACTICS
    | APPROVED_SOFT_RESISTANCE
    | APPROVED_LOGICAL_FALLACIES
    | APPROVED_COMPLIANCE
)


def validate_scenarios():
    """
    Reads all JSON files in the 'scenarios_to_check' directory
    and validates the 'tactic' field in each choice.
    """
    scenarios_dir = Path("scenarios_to_check")
    if not scenarios_dir.is_dir():
        print(f"Error: Directory '{scenarios_dir}' not found.")
        print("Please create it and place your JSON scenario files inside.")
        return

    print("--- Starting Tactic Validation ---")
    found_errors = False

    # Iterate over each JSON file in the directory
    for json_file in scenarios_dir.glob("*.json"):
        with open(json_file, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                print(f"\n[ERROR] Could not read {json_file.name}: {e}")
                found_errors = True
                continue
        
        scenario_id = data.get("id", "N/A")
        statements = data.get("statements", {})
        
        # Iterate through each statement (step) in the file
        for statement_id, statement_data in statements.items():
            choices = statement_data.get("user_choices", [])
            
            # Iterate through each choice in the statement
            for i, choice_data in enumerate(choices):
                tactic = choice_data.get("tactic")
                
                if tactic is None:
                    print(
                        f"\n[ERROR] Missing 'tactic' field in {json_file.name} -> "
                        f"statement '{statement_id}' -> choice {i+1}"
                    )
                    found_errors = True
                    continue
                
                # The core validation check
                if tactic not in ALL_APPROVED_TACTICS:
                    print(
                        f"\n[INVALID TACTIC FOUND!]"
                        f"\n  File:       {json_file.name}"
                        f"\n  Scenario:   {scenario_id}"
                        f"\n  Statement:  '{statement_id}'"
                        f"\n  Choice text: \"{choice_data.get('choice', 'N/A')}\""
                        f"\n  Invalid Tactic: '{tactic}'"
                    )
                    found_errors = True

    print("\n--- Validation Complete ---")
    if not found_errors:
        print("Success! All tactics in all files are valid.")
    else:
        print("\nFound one or more invalid tactics. Please review the errors above and correct your JSON files.")


if __name__ == "__main__":
    validate_scenarios()