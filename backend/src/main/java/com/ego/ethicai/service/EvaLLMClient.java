package com.ego.ethicai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.theokanning.openai.service.OpenAiService;
import com.theokanning.openai.completion.chat.*;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.Map;
@Slf4j
@Service
public class EvaLLMClient {

    private final OpenAiService openAiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String MODEL = "gpt-4o-mini";

    private static final Map<String, String> DEFINITIONS =  Map.ofEntries(Map.entry("Broadening who the user is in user research", "Expand the definition of 'user' to include marginalized or overlooked groups."),
        Map.entry("Designing affordances subversively", "Subtly introduce design elements that support ethical values without overtly challenging norms."),
        Map.entry("Making values visible rhetorically to other organizational stakeholders", "Reframe ethical concerns in terms that align with business goals, like risk or trust."),
        Map.entry("Expanding on and subverting design resources for others", "Adapt familiar design tools (e.g., personas) to highlight values or ethical issues."),
        Map.entry("Making values visible and legible through organizational metrics", "Use existing organizational metrics systems to track and surface ethical issues."),
        Map.entry("Using organizational values to create spaces for new forms of values work", "Invoke the company’s stated values (like diversity or responsibility) to support ethics work."),
        Map.entry("Guerrilla methods", "Use informal, scrappy methods to gather user insights quickly and cost-effectively."),
        Map.entry("Models that synthesize", "Create simplified conceptual models that unify complex ideas for easier communication."),
        Map.entry("Usability studies", "Use observed user behavior in structured testing to support design arguments."),
        Map.entry("Embodied knowledge of users", "Use your own or others’ lived experience to represent user perspectives."),
        Map.entry("Fidelity as a rhetorical strategy", "Use polished or realistic mockups to make a design idea more persuasive."),
        Map.entry("Envisioning", "Imagine and articulate future use scenarios to show long-term value."),
        Map.entry("Heuristics", "Invoke common design principles or standards as evidence."),
        Map.entry("Credibility and expertise", "Leverage your own or your team’s authority and past work to strengthen arguments."),
        Map.entry("Organizational memory", "Reference past decisions, successes, or failures to argue for or against a choice."),
        Map.entry("Usable enough", "Frame a design as sufficiently good to meet minimum goals when perfection isn’t feasible."),
        Map.entry("Distract and pacify", "Offer surface level solutions to delay or soften resistance to ethical concerns."),
        Map.entry("Acquiesce", "Concede on less critical values or features in order to maintain influence and avoid conflict."),
        Map.entry("Negotiation and cooperation", "Compromise with others to move a values-based goal forward in some form."),
        Map.entry("Being the user", "Adopt the end-user’s perspective in discussion to highlight their experience."),
        Map.entry("Strawman", "Misrepresent the opponent’s position in order to attack a weaker version of the opponent’s position."),
        Map.entry("Appeal to Authority", "Argue that your position is true due to the authority of someone else supporting it."),
        Map.entry("Slippery Slope", "Assert that a small first step inevitably leads to a chain of related events culminating in some significant event, thus the first step should not happen."),
        Map.entry("False Dilemma", "Assert that two alternative positions are held to be the only possible options, when in reality there are more."),
        Map.entry("Appeal to Ignorance", "Assume that a claim is true because it has not been or cannot be proven false, or vice versa."),
        Map.entry("Appeal to Popularity", "Assert that your argument is true because it is popular."),
        Map.entry("Hasty Generalization", "Make a broad conclusion based on a small sample or without all the information required to do so."),
        Map.entry("Red Herring", "Introduce an irrelevant or misleading topic to divert attention from the main argument at hand."),
        Map.entry("Circular Reasoning", "Assume the thing you are trying to prove is true.")
    );

    // 🔹 Difficulty levels
    private static final Map<Integer, String> DIFFICULTY_LEVELS = Map.of(
        1, "Friendly",
        2, "Considerate",
        3, "Neutral",
        4, "Dismissive",
        5, "Hostile"
    );

    private static final List<String> ARGUMENTATION_TACTICS = List.of(
        "Broadening Who the 'User' is in User Research",
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
        "Usable enough",
        "Distract and pacify",
        "Acquiesce",
        "Negotiation and cooperation",
        "Being the user"
    );

    private static final List<String> LOGICAL_FALLACIES = List.of(
        "Strawman",
        "Appeal to Authority",
        "Slippery Slope",
        "False Dilemma",
        "Appeal to Ignorance",
        "Appeal to Popularity",
        "Hasty Generalization",
        "Red Herring",
        "Circular Reasoning"
    );

    public EvaLLMClient(@Value("${openai.api.key}") String apiKey) {
        this.openAiService = new OpenAiService(apiKey, Duration.ofSeconds(60));
    }

    

    // ✅ Helper to map difficulty
    private static String getDifficultyLabel(int level) {
        return DIFFICULTY_LEVELS.getOrDefault(level, "Unknown");
    }

    // ✅ Core helper to send prompt to GPT
    private String runLLM(String prompt) {
        ChatCompletionRequest request = ChatCompletionRequest.builder()
            .model(MODEL)
            .messages(List.of(new ChatMessage("user", prompt)))
            .temperature(0.7)
            .maxTokens(250)
            .build();

        ChatCompletionResult result = openAiService.createChatCompletion(request);
        return result.getChoices().get(0).getMessage().getContent().trim();
    }

    // ✅ Manager generation (space for your prompts)
    public String callEvaManager(String managerType, String userStatement, int difficulty) {
        String difficultyLabel = getDifficultyLabel(difficulty);

        // 🔹 Placeholder manager prompts (replace with your own later)
        String managerPrompt = switch (managerType.toUpperCase()) {
            case "DILUTER" -> "Reply in 1-2 professional sentences as the \"Diluter\" manager archetype to ethical concerns about manipulative features, always maintaining the manipulative element but suggesting ways to soften, reframe, or camouflage it based on the colleague's input. Never propose fully supporting or discarding the manipulation. Adjust the response's tone according to the provided manager tone input—choose from: welcoming, considerate, neutral, dismissive, or hostile. Each reply must remain sharp and professional, referencing the manipulative tactic, critically reflecting on the concern, then proposing a diluted alternative rooted in the input and in the chosen tone.";
            case "CAMOUFLAGER" -> "Reply in 1–2 professional sentences as the \"Camouflager\" manager archetype. When colleagues raise ethical concerns about manipulative features, never remove or reveal the manipulation. Instead, suggest subtle ways to hide, disguise, or bury it. Always reference the ethical concern and the manipulative tactic first (reflection), then propose the camouflaging method (never removal or transparency). Adjust the overall tone of your response based on the given “manager tone” input—options: welcoming, considerate, neutral, dismissive, or hostile. Match your language and style to reflect the specified tone naturally.";
            case "CAPITALIST" -> "Reply in 1–2 professional sentences as the \"Capitalist\" manager archetype, adjusting the tone—welcoming, considerate, neutral, dismissive, or hostile—as specified by the manager tone input. When colleagues raise ethical concerns about manipulative features, never propose their removal or increased transparency. Instead, rationalize each feature by referencing examples of business competitors, relevant trends, or existing service/interface designs, explicitly connecting the justification to shareholder or business objectives without regard for other stakeholder needs. Tailor your response’s word choice, sentence structure, and manner to visibly match the manager tone provided.";
            default -> "You are a generic manager responding to concerns...";
        };

        String fullPrompt = managerPrompt +
            "\nUser statement: " + userStatement +
            "\nRespond in a " + difficultyLabel + " tone.";

        log.info("➡️ Manager Prompt: {}", fullPrompt);
        return runLLM(fullPrompt);
    }

    // ✅ User generation with tactics/fallacies
    public Map<String, Object> callEvaUser(String managerStatement, String tactic) {
        String userPrompt = """
            Assume the role of a junior software team member who strongly advocates for ethical software design.
            When you receive a product manager’s statement as input, along with the name of a argumentation pattern,
            generate a brief, professional response that argues for more ethical software design—
            specifically by employing the provided argument type against the manager’s position.
            Output a single, short (1–2 sentences) response that uses the specified argument type to promote ethical software design,
            with no additional content, labels, or formatting.

            Manager statement: %s
            Tactic: %s (%s)
            """.formatted(managerStatement, tactic, DEFINITIONS.getOrDefault(tactic, "No definition available"));

        String choice = runLLM(userPrompt);

        return Map.of(
            "choice", choice,
            "category", tactic,
            "EVS", assignEvsScore(tactic)
        );
    }

    // ✅ Helper for EVS score
    private int assignEvsScore(String tactic) {
        if (ARGUMENTATION_TACTICS.contains(tactic)) return 1;
        if (LOGICAL_FALLACIES.contains(tactic)) return 0;
        return 0;
    }

    // ✅ Generate response options (manager + 4 user choices)
    public JsonNode generateResponseOptions(String context, String managerStatement) {
        try {
            List<String> tacticsCopy = new ArrayList<>(ARGUMENTATION_TACTICS);
            List<String> fallaciesCopy = new ArrayList<>(LOGICAL_FALLACIES);
            Collections.shuffle(tacticsCopy);
            Collections.shuffle(fallaciesCopy);

            List<String> allMethods = List.of(
                tacticsCopy.get(0),
                tacticsCopy.get(1),
                fallaciesCopy.get(0),
                fallaciesCopy.get(1)
            );

            List<CompletableFuture<Map<String, Object>>> futures = new ArrayList<>();
            for (String tactic : allMethods) {
                futures.add(CompletableFuture.supplyAsync(() ->
                    callEvaUser(managerStatement, tactic)
                ));
            }

            List<Map<String, Object>> userChoices = futures.stream()
                .map(CompletableFuture::join)
                .toList();

            Map<String, Object> scenarioStep = Map.of(
                "manager_statement", managerStatement,
                "user_choices", userChoices
            );

            return objectMapper.valueToTree(scenarioStep);

        } catch (Exception e) {
            log.error("❌ Failed in generateResponseOptions. Context={}, ManagerStatement={}", context, managerStatement, e);
            throw new RuntimeException("Error generating user responses", e);
        }
    }

    // ✅ Generate only manager response
    public JsonNode generateManagerResponse(String context, String managerType, int difficulty) {
        try {
            String managerStatement = callEvaManager(managerType, context, difficulty);
            Map<String, Object> scenarioStep = Map.of(
                "manager_statement", managerStatement,
                "user_choices", ""
            );
            return objectMapper.valueToTree(scenarioStep);
        } catch (Exception e) {
            throw new RuntimeException("Error generating manager response", e);
        }
    }
}
