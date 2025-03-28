#!/usr/bin/env python3
"""
Example script demonstrating how to use the ethical practice module
in a command-line interface.
"""

import sys
import os
from practice_module import InteractionFlow

def clear_screen():
    """Clear the terminal screen."""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header(title):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f"{title.center(60)}")
    print("=" * 60 + "\n")

def select_scenario(flow):
    """Allow user to select a scenario."""
    clear_screen()
    print_header("ETHICAL DECISION-MAKING PRACTICE")
    
    print("Available scenarios:\n")
    scenarios = flow.get_available_scenarios()
    
    for i, scenario in enumerate(scenarios):
        intensity = scenario["ethical_breach_intensity"]
        intensity_display = {
            "High": "🔴 High",
            "Medium": "🟠 Medium",
            "Low": "🟡 Low"
        }.get(intensity, intensity)
        
        print(f"{i+1}. [{intensity_display}] {scenario['issue']}")
        print(f"   Ethical concern: {scenario['concern']}")
        print(f"   Manager type: {scenario['manager_type']}\n")
    
    while True:
        try:
            choice = int(input("Select a scenario number (or 0 to exit): "))
            if choice == 0:
                sys.exit(0)
            elif 1 <= choice <= len(scenarios):
                return scenarios[choice-1]["id"]
            else:
                print(f"Please enter a number between 1 and {len(scenarios)}")
        except ValueError:
            print("Please enter a valid number")

def display_manager_info(manager_type, manager_description):
    """Display information about the manager type."""
    print_header(f"{manager_type} Manager")
    print(f"{manager_description}\n")
    input("Press Enter to continue...")

def run_scenario(flow, scenario_id):
    """Run through a complete scenario interaction."""
    clear_screen()
    print_header("Starting Scenario")
    
    # Start the scenario
    scenario_data = flow.start_scenario(scenario_id)
    
    # Display manager information
    display_manager_info(
        scenario_data["scenario_context"]["manager_type"],
        scenario_data["scenario_context"]["manager_description"]
    )
    
    # Initialize variables for the loop
    is_complete = False
    current_statement = scenario_data["current_statement"]
    available_choices = scenario_data["available_choices"]
    
    # Main scenario loop
    while not is_complete:
        clear_screen()
        print_header("Ethical Scenario")
        
        # Display scenario context
        print(f"Issue: {scenario_data['scenario_context']['issue']}")
        print(f"Ethical Concern: {scenario_data['scenario_context']['concern']}")
        print(f"Manager Type: {scenario_data['scenario_context']['manager_type']}\n")
        
        # Display manager statement
        print("Manager:", current_statement)
        print("\nHow do you respond?\n")
        
        # Display response choices
        for i, choice in enumerate(available_choices):
            print(f"{i+1}. {choice}")
        
        # Get user's choice
        while True:
            try:
                choice = int(input("\nEnter your choice (1-4): "))
                if 1 <= choice <= len(available_choices):
                    choice_index = choice - 1
                    break
                else:
                    print(f"Please enter a number between 1 and {len(available_choices)}")
            except ValueError:
                print("Please enter a valid number")
        
        # Submit response and get feedback
        result = flow.submit_response(choice_index)
        
        # Display feedback
        clear_screen()
        print_header("Feedback")
        print(f"Your response: {available_choices[choice_index]}\n")
        print(f"Feedback: {result['feedback']}")
        print(f"Ethical Value Score: {result['evs']}")
        
        is_complete = result["is_complete"]
        
        if is_complete:
            # Show final evaluation
            input("\nPress Enter to see your final evaluation...")
            display_final_report(result["final_report"])
        else:
            # Update for next iteration
            current_statement = result["next_statement"]
            available_choices = result["available_choices"]
            input("\nPress Enter to continue to the next interaction...")

def display_final_report(report):
    """Display the final evaluation report."""
    clear_screen()
    print_header("Final Evaluation")
    
    print(f"Scenario: {report['issue']}")
    print(f"Ethical Concern: {report['concern']}")
    print(f"Manager Type: {report['manager_type']}")
    print(f"Ethical Breach Intensity: {report['ethical_breach_intensity']}\n")
    
    print(f"Your Score: {report['total_score']}/{report['max_possible_score']} ({report['percentage']}%)")
    print(f"Dominant Strategy: {report['dominant_strategy']}\n")
    
    print("Evaluation:")
    print(report["evaluation"])
    
    print("\nThank you for completing this ethical practice scenario!")
    input("\nPress Enter to return to the main menu...")

def display_strategy_information():
    """Display information about ethical strategies."""
    from practice_module import StrategyKnowledge
    
    clear_screen()
    print_header("Ethical Advocacy Strategies")
    
    knowledge = StrategyKnowledge()
    strategies = knowledge.get_all_strategies()
    
    for strategy, description in strategies.items():
        print(f"\n{strategy}:")
        print(description)
        print()
    
    input("Press Enter to return to the main menu...")

def display_manager_types():
    """Display information about manager types."""
    from practice_module import StrategyKnowledge
    
    clear_screen()
    print_header("Manager Types")
    
    knowledge = StrategyKnowledge()
    manager_types = knowledge.get_all_manager_types()
    
    for manager_type, description in manager_types.items():
        print(f"\n{manager_type}:")
        print(description)
        
        print("\nRecommended strategies:")
        for strategy in knowledge.get_recommended_strategies(manager_type):
            print(f"- {strategy}")
        print()
    
    input("Press Enter to return to the main menu...")

def main_menu():
    """Display the main menu and handle user choices."""
    flow = InteractionFlow()
    
    while True:
        clear_screen()
        print_header("Ethical Decision-Making Practice")
        
        print("1. Start a practice scenario")
        print("2. Learn about ethical advocacy strategies")
        print("3. Learn about manager types")
        print("4. Exit")
        
        try:
            choice = int(input("\nEnter your choice (1-4): "))
            
            if choice == 1:
                scenario_id = select_scenario(flow)
                run_scenario(flow, scenario_id)
            elif choice == 2:
                display_strategy_information()
            elif choice == 3:
                display_manager_types()
            elif choice == 4:
                print("\nThank you for using the ethical decision-making practice module!")
                sys.exit(0)
            else:
                print("Please enter a number between 1 and 4")
                input("\nPress Enter to continue...")
        except ValueError:
            print("Please enter a valid number")
            input("\nPress Enter to continue...")

if __name__ == "__main__":
    try:
        main_menu()
    except KeyboardInterrupt:
        print("\n\nProgram interrupted. Exiting...")
        sys.exit(0) 