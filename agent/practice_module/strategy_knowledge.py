class StrategyKnowledge:
    """
    Contains knowledge about ethical argumentation strategies and manager types.
    Provides descriptions and recommendations for effective ethical advocacy.
    """
    
    def __init__(self):
        """Initialize the strategy knowledge base."""
        self._strategy_descriptions = {
            "Direct Confrontation": (
                "Direct Confrontation involves explicitly challenging unethical directives or practices. "
                "This approach directly questions the ethical validity of a request or situation, often "
                "by elevating concerns to higher management or formally documenting objections. While "
                "effective for clear ethical breaches, this strategy carries higher personal risk and "
                "should be used judiciously when other approaches fail or when the ethical issue is severe."
            ),
            
            "Persuasive Rhetoric": (
                "Persuasive Rhetoric uses convincing arguments that align ethical concerns with "
                "organizational goals. This strategy frames ethical considerations in terms of business "
                "value, competitive advantage, risk management, or legal compliance. It's particularly "
                "effective when you can demonstrate how ethical behavior contributes to long-term success "
                "or how unethical actions could damage the organization financially or reputationally."
            ),
            
            "Process-Based Advocacy": (
                "Process-Based Advocacy leverages existing organizational processes, standards, or "
                "governance structures to address ethical concerns. This includes suggesting formal "
                "reviews, impact assessments, stakeholder consultations, or applying established ethical "
                "frameworks. This approach embeds ethical considerations within standard organizational "
                "procedures, making them harder to dismiss and creating documented evidence of concerns."
            ),
            
            "Soft Resistance": (
                "Soft Resistance employs subtle approaches to mitigate ethical issues while avoiding "
                "direct confrontation. This might include implementing minimal ethical safeguards, "
                "documenting concerns, delaying problematic implementations, or suggesting compromises. "
                "While this strategy may not fully resolve ethical issues, it can reduce harm when more "
                "direct approaches aren't feasible due to organizational constraints or power dynamics."
            ),
            
            "None": (
                "This represents compliance with directives despite ethical concerns, or failure to "
                "recognize ethical implications. While compliance may sometimes be necessary due to "
                "power dynamics, repeated patterns of yielding to unethical pressures can normalize "
                "problematic practices and contribute to ethical erosion in organizations."
            )
        }
        
        self._manager_descriptions = {
            "Puppeteer": (
                "Puppeteer managers actively manipulate employees to engage in unethical behavior through "
                "direct pressure, intimidation, or creating environments where ethical violations feel "
                "necessary. They often use authority, deadlines, or veiled threats to push questionable "
                "practices. When facing this type, document all interactions, seek allies, and use "
                "formal processes where possible to protect yourself while addressing ethical concerns."
            ),
            
            "Camouflager": (
                "Camouflager managers disguise unethical requests as standard business practices or hide "
                "problematic aspects behind technical language and euphemisms. They reframe ethical issues "
                "as business necessities or technical requirements. When dealing with camouflagers, expose "
                "hidden ethical dimensions through clear language, thorough documentation, and by connecting "
                "abstract decisions to concrete impacts on stakeholders."
            ),
            
            "Diluter": (
                "Diluter managers acknowledge ethical concerns but systematically minimize their importance "
                "or urgency. They often agree with concerns in principle while suggesting they're not "
                "applicable in the current context or can be addressed later. When working with diluters, "
                "maintain focus on ethical issues through consistent documentation, specific examples, and "
                "by connecting ethical concerns to immediate business risks."
            ),
            
            "Ethical": (
                "Ethical managers prioritize ethical considerations alongside business objectives and create "
                "environments where raising concerns is encouraged. They model ethical behavior, provide "
                "resources for ethical decision-making, and reward ethical leadership. When working with "
                "ethical managers, leverage their support to establish stronger ethical processes and "
                "advocate for systemic changes to prevent future issues."
            )
        }
        
        self._recommended_strategies = {
            "Puppeteer": ["Process-Based Advocacy", "Direct Confrontation", "Persuasive Rhetoric"],
            "Camouflager": ["Persuasive Rhetoric", "Process-Based Advocacy", "Direct Confrontation"],
            "Diluter": ["Persuasive Rhetoric", "Process-Based Advocacy", "Soft Resistance"],
            "Ethical": ["Process-Based Advocacy", "Persuasive Rhetoric", "Soft Resistance"]
        }
    
    def get_strategy_description(self, strategy_name: str) -> str:
        """
        Get a description of an ethical argumentation strategy.
        
        Args:
            strategy_name: Name of the strategy
            
        Returns:
            Description of the strategy or error message if not found
        """
        return self._strategy_descriptions.get(
            strategy_name, 
            f"Strategy '{strategy_name}' not found in knowledge base."
        )
    
    def get_manager_description(self, manager_type: str) -> str:
        """
        Get a description of a manager type.
        
        Args:
            manager_type: Type of manager
            
        Returns:
            Description of the manager type or error message if not found
        """
        return self._manager_descriptions.get(
            manager_type,
            f"Manager type '{manager_type}' not found in knowledge base."
        )
    
    def get_recommended_strategies(self, manager_type: str) -> list:
        """
        Get recommended strategies for dealing with a specific manager type.
        
        Args:
            manager_type: Type of manager
            
        Returns:
            List of recommended strategies or empty list if manager type not found
        """
        return self._recommended_strategies.get(manager_type, [])
    
    def get_all_strategies(self) -> dict:
        """Get all ethical argumentation strategies and their descriptions."""
        return {k: v for k, v in self._strategy_descriptions.items() if k != "None"}
    
    def get_all_manager_types(self) -> dict:
        """Get all manager types and their descriptions."""
        return self._manager_descriptions


# Example usage
if __name__ == "__main__":
    knowledge = StrategyKnowledge()
    
    print("===== ETHICAL ARGUMENTATION STRATEGIES =====")
    for strategy, description in knowledge.get_all_strategies().items():
        print(f"\n{strategy}:")
        print(description)
    
    print("\n\n===== MANAGER TYPES =====")
    for manager_type, description in knowledge.get_all_manager_types().items():
        print(f"\n{manager_type}:")
        print(description)
        
        print("\nRecommended strategies:")
        for strategy in knowledge.get_recommended_strategies(manager_type):
            print(f"- {strategy}") 