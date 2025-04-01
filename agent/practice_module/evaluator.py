import json
from typing import Dict, List, Optional, Tuple
import random  # Add import at the top of the file if needed

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
        """Generate more conversational, coaching-style feedback."""
        evs = choice["EVS"]
        category = choice["category"]
        
        # More conversational, friendly feedback templates
        if evs >= 3:
            templates = [
                f"That's a fantastic approach using {category}! You really nailed the ethical reasoning while keeping the conversation professional. Great job seeing both the ethical and practical sides here.",
                f"Excellent choice! Your {category} approach shows real thoughtfulness. I love how you balanced addressing the ethical concern while maintaining a constructive relationship.",
                f"Really well done! Using {category} here was spot-on. You found a way to stand up for ethical principles while still being practical and professional. That's exactly what works in real situations."
            ]
            return random.choice(templates)
        elif evs == 2:
            templates = [
                f"Good thinking with this {category} approach! You're definitely on the right track here. This shows solid ethical reasoning while still being practical.",
                f"Nice work using {category}! This is a solid approach that addresses the ethical concern effectively. It shows you're thinking about both principles and practical implementation.",
                f"That's a good strategy! Your {category} approach demonstrates thoughtful ethical reasoning. You're balancing multiple considerations well here."
            ]
            return random.choice(templates)
        elif evs == 1:
            templates = [
                f"I see where you're going with this {category} approach. It shows awareness of the ethical issue, though there might be more direct ways to address it while still being professional.",
                f"You're showing ethical awareness with this {category} approach, which is good! With a bit more directness, you could make an even stronger case while keeping it constructive.",
                f"There's good thinking in your {category} approach. You're being thoughtful, though you could perhaps be a bit more specific about the ethical principle at stake."
            ]
            return random.choice(templates)
        elif evs == 0:
            templates = [
                f"I understand why you might take this approach. It acknowledges the issue, but doesn't quite address the ethical concern directly. Consider being a bit more specific about what principles are at stake.",
                f"I see you're trying to keep things civil, which is good! However, this response doesn't fully address the ethical issue. Try being more specific about your ethical concerns while staying professional.",
                f"You're being cautious, which makes sense in workplace situations. However, this response might not effectively communicate the ethical importance of the issue. Consider being more direct while remaining respectful."
            ]
            return random.choice(templates)
        else:
            templates = [
                f"I understand the instinct to go along with authority, but this response might compromise ethical standards. Remember that respectful ethical advocacy is part of professional responsibility.",
                f"I see you're prioritizing workplace harmony, which is understandable. However, this approach may miss an opportunity to address an important ethical concern. Consider how you might raise issues constructively.",
                f"I understand why this might feel like the path of least resistance. However, remember that ethical considerations are an important part of professional decision-making. There are ways to raise concerns respectfully."
            ]
            return random.choice(templates)
    
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
        
        # Generate conversational feedback based on score percentage
        if percentage >= 80:
            evaluation = "Great job! 🎉 You showed excellent ethical reasoning throughout this scenario. I really liked how you consistently prioritized ethical considerations while still addressing business concerns in a practical way. This balanced approach is exactly what makes ethical advocacy effective in real workplace situations."
        elif percentage >= 60:
            evaluation = "Nice work! You showed good ethical awareness in this scenario. You generally made sound ethical choices, though there were a few opportunities where you could have been a bit more assertive in your ethical advocacy. Keep practicing this balance and you'll be even more effective in navigating these tricky situations."
        elif percentage >= 40:
            evaluation = "You're on the right track with your ethical reasoning. I noticed you showed awareness of the ethical issues, but sometimes deferred to authority or business concerns when conflicts arose. With practice, you can develop more confidence in advocating for ethical positions while still being respectful and professional."
        else:
            evaluation = "Thank you for working through this tough scenario. There's definitely room to strengthen your ethical advocacy skills. Consider how you might more effectively balance business goals with ethical principles. Remember that ethical concerns can often be framed in ways that align with business success, making your advocacy more effective."
        
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