import json
from typing import Dict, List, Optional, Any
from .evaluator import EthicalScenarioEvaluator
from .strategy_knowledge import StrategyKnowledge

class InteractionFlow:
    """
    Manages the interaction flow for ethical scenario practice sessions.
    This class orchestrates the conversation between the user and the 
    simulated manager persona.
    """
    
    def __init__(self, scenarios_file_path: str = "practice_module/scenarios.json"):
        """
        Initialize the interaction flow with the evaluator and strategy knowledge.
        
        Args:
            scenarios_file_path: Path to the scenarios JSON file
        """
        self.evaluator = EthicalScenarioEvaluator(scenarios_file_path)
        self.strategy_knowledge = StrategyKnowledge()
        self.active_scenario = None
        self.conversation_history = []
        self.available_scenarios = self._load_available_scenarios()
        
    def _load_available_scenarios(self) -> List[Dict]:
        """Load metadata about available scenarios for selection."""
        scenarios = []
        for scenario in self.evaluator.scenarios['scenarios']:
            scenarios.append({
                "id": scenario["id"],
                "concern": scenario["concern"],
                "issue": scenario["issue"],
                "manager_type": scenario["manager_type"],
                "ethical_breach_intensity": scenario["ethical_breach_intensity"]
            })
        return scenarios
    
    def get_available_scenarios(self) -> List[Dict]:
        """Return the list of available scenarios."""
        return self.available_scenarios
    
    def start_scenario(self, scenario_id: str) -> Dict:
        """
        Start a new ethical practice scenario.
        
        Args:
            scenario_id: ID of the scenario to start
            
        Returns:
            Dict containing the initial scenario context and first manager statement
        """
        self.conversation_history = []
        scenario_data = self.evaluator.start_scenario(scenario_id)
        
        if "error" in scenario_data:
            return scenario_data
        
        self.active_scenario = scenario_data
        
        # Add context to conversation history
        self.conversation_history.append({
            "type": "context",
            "content": f"Scenario: {scenario_data['issue']} (Ethical Concern: {scenario_data['concern']})\n"
                      f"You are interacting with a {scenario_data['manager_type']} manager type."
        })
        
        # Add first manager statement
        self.conversation_history.append({
            "type": "manager",
            "content": scenario_data["statement"]
        })
        
        # Get manager type information for context
        manager_info = self.strategy_knowledge.get_manager_description(scenario_data["manager_type"])
        
        return {
            "scenario_context": {
                "id": scenario_data["scenario_id"],
                "concern": scenario_data["concern"],
                "issue": scenario_data["issue"],
                "manager_type": scenario_data["manager_type"],
                "manager_description": manager_info
            },
            "current_statement": scenario_data["statement"],
            "available_choices": scenario_data["choices"],
            "conversation_history": self.conversation_history
        }
    
    def submit_response(self, choice_index: int) -> Dict:
        """
        Submit the user's response to the current manager statement.
        
        Args:
            choice_index: Index of the chosen response
            
        Returns:
            Dict containing evaluation, feedback, and next steps
        """
        if not self.active_scenario:
            return {"error": "No active scenario. Please start a scenario first."}
        
        # Get the user's choice text
        user_choice = self.evaluator.current_scenario["manager_statements"][
            self.evaluator.current_statement_index]["user_choices"][choice_index]["choice"]
        
        # Add user response to conversation history
        self.conversation_history.append({
            "type": "user",
            "content": user_choice
        })
        
        # Evaluate the response
        result = self.evaluator.evaluate_response(choice_index)
        
        # Add feedback to conversation history
        self.conversation_history.append({
            "type": "feedback",
            "content": result["feedback"],
            "evs": result["evs"],
            "category": result["choice_category"]
        })
        
        # Add strategy information if applicable
        if result["choice_category"] != "None":
            strategy_info = self.strategy_knowledge.get_strategy_description(result["choice_category"])
            self.conversation_history.append({
                "type": "strategy_info",
                "content": strategy_info
            })
        
        response_data = {
            "feedback": result["feedback"],
            "evs": result["evs"],
            "conversation_history": self.conversation_history,
            "is_complete": result["is_complete"]
        }
        
        # If scenario continues, add next manager statement
        if not result["is_complete"]:
            self.conversation_history.append({
                "type": "manager",
                "content": result["next_statement"]
            })
            
            response_data["next_statement"] = result["next_statement"]
            response_data["available_choices"] = result["next_choices"]
        else:
            # Get final report if scenario is complete
            final_report = self.evaluator.get_final_report()
            
            # Add final evaluation to conversation history
            self.conversation_history.append({
                "type": "final_evaluation",
                "content": final_report["evaluation"],
                "score": final_report["total_score"],
                "max_score": final_report["max_possible_score"],
                "percentage": final_report["percentage"],
                "dominant_strategy": final_report["dominant_strategy"]
            })
            
            response_data["final_report"] = final_report
        
        return response_data
    
    def get_strategy_recommendation(self, manager_type: str) -> Dict:
        """
        Get strategy recommendations for dealing with a specific manager type.
        
        Args:
            manager_type: The type of manager (e.g., "Puppeteer", "Camouflager")
            
        Returns:
            Dict containing recommended strategies and their descriptions
        """
        recommended_strategies = self.strategy_knowledge.get_recommended_strategies(manager_type)
        
        return {
            "manager_type": manager_type,
            "manager_description": self.strategy_knowledge.get_manager_description(manager_type),
            "recommended_strategies": [{
                "name": strategy,
                "description": self.strategy_knowledge.get_strategy_description(strategy)
            } for strategy in recommended_strategies]
        }
    
    def reset(self) -> Dict:
        """Reset the current practice session."""
        self.active_scenario = None
        self.conversation_history = []
        return {"status": "Practice session reset", "available_scenarios": self.available_scenarios}


# Example usage
if __name__ == "__main__":
    flow = InteractionFlow()
    
    # Print available scenarios
    print("Available Scenarios:")
    for scenario in flow.get_available_scenarios():
        print(f"- {scenario['id']}: {scenario['issue']} (Concern: {scenario['concern']})")
    
    # Start a scenario
    scenario_data = flow.start_scenario("scenario_1")
    print(f"\nStarting scenario: {scenario_data['scenario_context']['issue']}")
    print(f"Manager type: {scenario_data['scenario_context']['manager_type']}")
    print(f"\nManager: {scenario_data['current_statement']}")
    
    # Print choices
    print("\nYour options:")
    for i, choice in enumerate(scenario_data['available_choices']):
        print(f"{i+1}. {choice}")
    
    # Simulate user responses (in a real application, these would come from user input)
    responses = [0, 1, 2, 1, 0]  # Example choices
    
    for response_idx in responses:
        print(f"\nSelected: {scenario_data['available_choices'][response_idx]}")
        
        result = flow.submit_response(response_idx)
        print(f"Feedback: {result['feedback']}")
        print(f"EVS: {result['evs']}")
        
        if not result["is_complete"]:
            print(f"\nManager: {result['next_statement']}")
            
            # Print next set of choices
            print("\nYour options:")
            for i, choice in enumerate(result['available_choices']):
                print(f"{i+1}. {choice}")
                
            # Update scenario_data for next iteration
            scenario_data = {
                'available_choices': result['available_choices'],
                'current_statement': result['next_statement']
            }
        else:
            # Print final report
            report = result["final_report"]
            print("\n===== FINAL EVALUATION =====")
            print(f"Score: {report['total_score']}/{report['max_possible_score']} ({report['percentage']}%)")
            print(f"Dominant strategy: {report['dominant_strategy']}")
            print(f"Evaluation: {report['evaluation']}")
            break 