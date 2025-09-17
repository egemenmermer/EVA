# Ethical Decision-Making Practice Module

This module provides an interactive simulation of ethical scenarios commonly encountered in software engineering. It allows users to practice ethical decision-making and learn effective strategies for ethical advocacy in professional settings.

## Overview

The practice module simulates interactions with different manager types who present ethically challenging scenarios. Users are presented with multiple response options, each representing different ethical advocacy strategies. The module evaluates responses, provides feedback, and generates a final evaluation at the end of each scenario.

## Key Components

1. **Ethical Scenarios**: Pre-defined scenarios focusing on common ethical issues in software engineering (privacy, bias, transparency, etc.)
2. **Manager Types**: Different managerial personas that present ethical challenges in distinct ways:
   - **Puppeteer**: Explicitly pressures employees to engage in unethical behavior
   - **Camouflager**: Disguises unethical requests as standard business practices
   - **Diluter**: Acknowledges ethical concerns but minimizes their importance
3. **Ethical Advocacy Strategies**:
   - **Direct Confrontation**: Explicitly challenging unethical directives
   - **Persuasive Rhetoric**: Aligning ethical concerns with organizational goals
   - **Process-Based Advocacy**: Using organizational processes to address ethical concerns
   - **Soft Resistance**: Subtle approaches to mitigate ethical issues

## Usage

### Basic Usage

```python
from practice_module import InteractionFlow

# Initialize the interaction flow
flow = InteractionFlow()

# Get available scenarios
available_scenarios = flow.get_available_scenarios()
for scenario in available_scenarios:
    print(f"{scenario['id']}: {scenario['issue']} ({scenario['concern']})")

# Start a scenario
scenario_id = "scenario_1"  # Choose from available scenarios
scenario_data = flow.start_scenario(scenario_id)

# Display initial scenario info
print(f"Scenario: {scenario_data['scenario_context']['issue']}")
print(f"Manager type: {scenario_data['scenario_context']['manager_type']}")
print(f"Manager says: {scenario_data['current_statement']}")

# Display response options
for i, choice in enumerate(scenario_data['available_choices']):
    print(f"{i+1}. {choice}")

# Submit user response (index of chosen response)
choice_index = 0  # User selected the first option
result = flow.submit_response(choice_index)

# Display feedback
print(f"Feedback: {result['feedback']}")
print(f"Ethical Value Score: {result['evs']}")

# If scenario continues, get next statement and choices
if not result['is_complete']:
    print(f"Manager says: {result['next_statement']}")
    for i, choice in enumerate(result['available_choices']):
        print(f"{i+1}. {choice}")
else:
    # Display final evaluation
    report = result['final_report']
    print(f"Final score: {report['percentage']}%")
    print(f"Evaluation: {report['evaluation']}")
```

### Getting Strategy Recommendations

```python
from practice_module import InteractionFlow

flow = InteractionFlow()

# Get recommendations for dealing with a specific manager type
manager_type = "Camouflager"
recommendations = flow.get_strategy_recommendation(manager_type)

print(f"Manager type: {manager_type}")
print(f"Description: {recommendations['manager_description']}")

print("Recommended strategies:")
for strategy in recommendations['recommended_strategies']:
    print(f"- {strategy['name']}: {strategy['description']}")
```

## Extending the Module

### Adding New Scenarios

To add new scenarios, modify the `scenarios.json` file to include additional scenario definitions following the existing format:

```json
{
  "id": "scenario_X",
  "concern": "Ethical concern category",
  "issue": "Specific ethical issue",
  "manager_type": "One of: Puppeteer, Camouflager, Diluter",
  "ethical_breach_intensity": "High|Medium|Low",
  "manager_statements": [
    {
      "statement": "What the manager says",
      "user_choices": [
        {
          "choice": "Response option 1",
          "category": "Ethical strategy category",
          "EVS": 3
        },
        // Additional choices...
      ]
    },
    // Additional manager statements...
  ]
}
```

### Custom Evaluation Logic

To modify the evaluation logic, edit the `evaluator.py` file, particularly the `_generate_feedback` method and the scoring calculations in the `evaluate_response` method.

## Integration with Main Application

This practice module can be integrated into the main application by:

1. Importing the `InteractionFlow` class from the practice_module
2. Creating API endpoints or UI components that interact with the flow methods
3. Displaying scenarios, choices, and feedback to users through the application interface

## Examples

See the `__main__` sections in each module file for usage examples:
- `evaluator.py` - Example of direct evaluation usage
- `interaction_flow.py` - Example of complete scenario interaction
- `strategy_knowledge.py` - Example of accessing strategy and manager descriptions 