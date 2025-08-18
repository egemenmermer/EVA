import openai

def generate_manager_statement_and_choices(context: str) -> dict:
    """
    Generate a manager's statement and corresponding user choices dynamically.
    Args:
        context (str): The scenario context provided by the user.
    Returns:
        dict: A dictionary containing the manager's statement and user choices.
    """
    prompt = f"""
    Given the following statement from a software developer: "{context}", generate a product manager's given the scenario.
    Then, provide 4 user choices with categories and EVS values. Format the response as JSON.
    """
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for generating ethical scenarios."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        scenario = eval(response['choices'][0]['message']['content'])  # Parse the JSON-like response
        return scenario
    except Exception as e:
        print(f"Error generating scenario: {e}")
        return {}

def generate_manager_statement(context: str) -> str:
    """
    Generate only the manager's statement dynamically.
    Args:
        context (str): The scenario context provided by the user.
    Returns:
        str: The manager's statement.
    """
    prompt = f"""
    Given the following context: "{context}", generate a manager's statement for an ethical dilemma scenario.
    """
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for generating ethical scenarios."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        statement = response['choices'][0]['message']['content'].strip()
        return statement
    except Exception as e:
        print(f"Error generating manager statement: {e}")
        return ""

def mode_1(context: str):
    """
    Mode 1: Generate both manager's statement and user choices.
    Args:
        context (str): The scenario context provided by the user.
    """
    scenario = generate_manager_statement_and_choices(context)
    print("Manager's Statement:", scenario.get("manager_statement", ""))
    print("User Choices:")
    for choice in scenario.get("user_choices", []):
        print(f"- {choice['choice']} (Category: {choice['category']}, EVS: {choice['EVS']})")

def mode_2(context: str):
    """
    Mode 2: Generate only the manager's statement and allow the user to provide their own response.
    Args:
        context (str): The scenario context provided by the user.
    """
    manager_statement = generate_manager_statement(context)
    print("Manager's Statement:", manager_statement)
    user_response = input("Your Response: ")
    print("You responded:", user_response)

# Example Usage
context = "You are a software engineer asked to implement a feature that tracks user location without consent."
print("Mode 1:")
mode_1(context)
print("\nMode 2:")
mode_2(context)