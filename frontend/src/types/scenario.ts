export interface ScenarioSessionResponse {
  conversationId: any;
  scenarioId: string;
  sessionId: string;
  concern: string;
  scenarioTitle: string;
  scenarioDescription: string;
  issue: string;
  managerType: string;
  difficulty: number;
  currentStatementId: string;
  currentStatement: string;
  choices: Array<{
    index: number;
    text: string;
    category: string;
  }>;
  currentStep: number;
  isComplete: boolean;
}

export interface ScenarioState {
  scenario: {
    id: string;
    title: string;
    description: string;
    issue: string;
    managerType: string;
    concern: string;
    difficulty: number;
  };
  sessionId: string;
  conversation: any[];
  currentStatement: string | null;
  currentStatementId: string | null;
  currentChoices: Array<{
    index: number;
    text: string;
    category: string;
    originalIndex?: number;
  }>;
  currentStep: number;
  isComplete: boolean;
  sessionSummary?: any;
}
