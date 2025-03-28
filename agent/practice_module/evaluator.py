import json
from typing import Dict, List, Optional, Tuple

class EthicalScenarioEvaluator:
    """
    Evaluates user responses to ethical scenarios and provides feedback
    based on the Ethical Value Score (EVS).
    """
    
    def __init__(self, scenarios_file_path: str = "practice_module/scenarios.json"):
        """
        Initialize the evaluator with the scenarios file.
        
        Args:
            scenarios_file_path: Path to the scenarios JSON file
        """
        self.scenarios = self._load_scenarios(scenarios_file_path)
        self.user_responses = {}
        self.current_scenario = None
        self.current_statement_index = 0
        self.total_score = 0
        self.max_possible_score = 0
        
    def _load_scenarios(self, file_path: str) -> Dict:
        """Load scenarios from JSON file."""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                return data
        except Exception as e:
            print(f"Error loading scenarios: {e}")
            return {"scenarios": []}
    
    def get_scenario(self, scenario_id: str) -> Optional[Dict]:
        """Get a specific scenario by ID."""
        for scenario in self.scenarios['scenarios']:
            if scenario['id'] == scenario_id:
                return scenario
        return None
    
    def start_scenario(self, scenario_id: str) -> Dict:
        """
        Start a new scenario evaluation session.
        
        Args:
            scenario_id: ID of the scenario to start
            
        Returns:
            Dict containing the scenario information
        """
        scenario = self.get_scenario(scenario_id)
        if not scenario:
            return {"error": f"Scenario with ID {scenario_id} not found"}
        
        self.current_scenario = scenario
        self.current_statement_index = 0
        self.user_responses = {}
        self.total_score = 0
        self.max_possible_score = 0
        
        return {
            "scenario_id": scenario["id"],
            "concern": scenario["concern"],
            "issue": scenario["issue"],
            "manager_type": scenario["manager_type"],
            "statement": scenario["manager_statements"][0]["statement"],
            "choices": [choice["choice"] for choice in scenario["manager_statements"][0]["user_choices"]]
        }
    
    def evaluate_response(self, choice_index: int) -> Dict:
        """
        Evaluate a user's response to the current statement.
        
        Args:
            choice_index: Index of the choice selected by the user
            
        Returns:
            Dict containing feedback and the next statement if available
        """
        if not self.current_scenario:
            return {"error": "No active scenario. Call start_scenario first."}
        
        current_statement = self.current_scenario["manager_statements"][self.current_statement_index]
        
        if choice_index < 0 or choice_index >= len(current_statement["user_choices"]):
            return {"error": f"Invalid choice index: {choice_index}"}
        
        choice = current_statement["user_choices"][choice_index]
        self.user_responses[self.current_statement_index] = choice
        
        # Calculate scores
        evs = choice["EVS"]
        self.total_score += evs
        
        # Find the max possible score for this statement
        max_evs = max(c["EVS"] for c in current_statement["user_choices"])
        self.max_possible_score += max_evs
        
        # Generate feedback
        feedback = self._generate_feedback(choice)
        
        # Move to next statement if available
        self.current_statement_index += 1
        next_statement = None
        next_choices = None
        is_complete = self.current_statement_index >= len(self.current_scenario["manager_statements"])
        
        if not is_complete:
            next_statement = self.current_scenario["manager_statements"][self.current_statement_index]["statement"]
            next_choices = [c["choice"] for c in self.current_scenario["manager_statements"][self.current_statement_index]["user_choices"]]
        
        return {
            "choice_category": choice["category"],
            "evs": evs,
            "feedback": feedback,
            "next_statement": next_statement,
            "next_choices": next_choices,
            "is_complete": is_complete
        }
    
    def _generate_feedback(self, choice: Dict) -> str:
        """Generate feedback based on the user's choice."""
        evs = choice["EVS"]
        category = choice["category"]
        
        if evs >= 3:
            return f"Excellent choice using {category}. This response strongly upholds ethical principles while effectively addressing business concerns."
        elif evs == 2:
            return f"Good approach using {category}. You're advocating for ethics through established processes, which is often effective in organizational settings."
        elif evs == 1:
            return f"Your {category} approach shows ethical awareness, though there might be more impactful ways to address the concern."
        elif evs == 0:
            return "This response acknowledges the ethical issue but doesn't take strong action to address it."
        else:
            return "This response may prioritize compliance with authority over ethical considerations. Consider how you might better advocate for ethical practices."
    
    def get_final_report(self) -> Dict:
        """
        Generate a final report after completing the scenario.
        
        Returns:
            Dict containing the final score and evaluation
        """
        if not self.current_scenario or not self.user_responses:
            return {"error": "No completed scenario to evaluate"}
        
        percentage = (self.total_score / self.max_possible_score * 100) if self.max_possible_score > 0 else 0
        
        # Categorize the overall response strategy
        strategies = {}
        for idx, response in self.user_responses.items():
            category = response["category"]
            if category != "None":
                strategies[category] = strategies.get(category, 0) + 1
        
        dominant_strategy = max(strategies.items(), key=lambda x: x[1])[0] if strategies else "None"
        
        # Generate feedback based on score percentage
        if percentage >= 80:
            evaluation = "Excellent ethical reasoning! You consistently prioritize ethical considerations while effectively addressing business concerns."
        elif percentage >= 60:
            evaluation = "Good ethical awareness. You generally make ethically sound choices, though there's room for more assertive ethical advocacy."
        elif percentage >= 40:
            evaluation = "Moderate ethical reasoning. You show some ethical awareness but often defer to authority or business concerns when conflicts arise."
        else:
            evaluation = "There's significant room for improving your ethical advocacy. Consider how you might more effectively balance business goals with ethical principles."
        
        return {
            "scenario_id": self.current_scenario["id"],
            "concern": self.current_scenario["concern"],
            "issue": self.current_scenario["issue"],
            "manager_type": self.current_scenario["manager_type"],
            "ethical_breach_intensity": self.current_scenario["ethical_breach_intensity"],
            "total_score": self.total_score,
            "max_possible_score": self.max_possible_score,
            "percentage": round(percentage, 1),
            "dominant_strategy": dominant_strategy,
            "evaluation": evaluation,
            "detailed_responses": self.user_responses
        }


# Example usage
if __name__ == "__main__":
    evaluator = EthicalScenarioEvaluator()
    # Start a scenario
    scenario_data = evaluator.start_scenario("scenario_1")
    print(f"Starting scenario: {scenario_data['issue']}")
    print(f"Manager statement: {scenario_data['statement']}")
    
    # Simulate responses (in a real application, these would come from user input)
    responses = [0, 1, 2, 1, 0]  # Example choices for each statement
    
    for response_idx in responses:
        result = evaluator.evaluate_response(response_idx)
        print(f"\nFeedback: {result['feedback']}")
        print(f"EVS: {result['evs']}")
        
        if not result["is_complete"]:
            print(f"\nNext statement: {result['next_statement']}")
        else:
            print("\nScenario complete!")
            
    # Get final report
    report = evaluator.get_final_report()
    print("\n===== FINAL REPORT =====")
    print(f"Scenario: {report['issue']}")
    print(f"Score: {report['total_score']}/{report['max_possible_score']} ({report['percentage']}%)")
    print(f"Dominant strategy: {report['dominant_strategy']}")
    print(f"Evaluation: {report['evaluation']}") 