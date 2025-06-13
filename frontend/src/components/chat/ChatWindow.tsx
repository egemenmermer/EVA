import React, { useState, useEffect, useRef, Dispatch, SetStateAction, useCallback } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { EditDraftModal } from './EditDraftModal'; // Import the modal component
import { ScenarioSelectionModal } from '@/components/modals/ScenarioSelectionModal'; // Import our new modal
import { SimplifiedTacticsModal } from '../modals/SimplifiedTacticsModal'; // Import simplified tactics modal
import { analyzeMessageForScenarioCompletion } from '@/utils/scenarioTracker';
import { useStore, ManagerType, Conversation, Message } from '@/store/useStore';
import { Role } from '@/types/index';
import { conversationApi, saveMessage, getManagerType, sendMessage as apiSendMessage, agentCreateConversation } from '@/services/api'; // Import saveMessage, getManagerType, sendMessage, and agentCreateConversation
import { v4 as uuidv4 } from 'uuid';
import type { ConversationContentResponseDTO } from '@/types/api';
import PracticeModule from '../practice/PracticeModule';
import { BookOpen, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { agentApi } from '../../services/axiosConfig'; // Restored agentApi
import ReactMarkdown, { Options as ReactMarkdownOptions } from 'react-markdown'; // Import Options
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion"; // Changed to relative path
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; // Corrected import for PrismLight
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Import oneDark style
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'; // Example: register language
import logoLight from '@/assets/logo-light.svg';
import logoDark from '@/assets/logo-dark.svg';
import { Button } from "@/components/ui/button"; // Reverted to alias path
import { cn } from "@/lib/utils";
import logoSvg from "@/assets/logo.svg";
import { markAccessibilityScenariosCompletedAPI, markPrivacyScenariosCompletedAPI } from '../../utils/surveyUtils';
import { backendApi } from '../../services/axiosConfig';

// Add custom styles for message formatting
const styles = {
  messageContent: {
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  paragraph: {
    marginBottom: '1rem',
  },
  bulletPoint: {
    marginLeft: '1.5rem',
    position: 'relative',
  },
  feedbackContent: {
    '& p': {
      marginBottom: '0.75rem',
    },
    '& .ml-4': {
      marginLeft: '1rem',
      display: 'flex',
      alignItems: 'flex-start',
    },
    '& strong': {
      fontWeight: '600',
    },
  }
};

// Add WebKit scrollbar styles
import './scrollbar.css';

// Add animation styles
const animationStyles = `
  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translateX(15px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(-15px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .message-enter-user {
    animation: fadeInRight 0.3s ease-out forwards;
  }

  .message-enter-assistant {
    animation: fadeInLeft 0.3s ease-out forwards;
  }

  .loading-animation {
    animation: fadeSlideIn 0.2s ease-out forwards;
  }
`;

// Extended ConversationContentResponseDTO with additional fields from backend
interface ExtendedConversationDTO extends ConversationContentResponseDTO {
  userQuery?: string;
  agentResponse?: string;
  isUserMessage?: boolean;
  isLoading?: boolean;
  managerType?: ManagerType;
  title?: string;
  preview?: string;
  modelName?: string;
  personaUsed?: string;
}

// Function to get the current persona from the store
const getCurrentPersona = (): string => {
  const managerType = useStore.getState().managerType;
  return managerType || 'PUPPETEER';
};

// Add a new interface for the updated response format
interface MessageResponseDTO {
  messages: Message[];
}

interface APIResponse {
  messages: Message[];
}

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  renderMessage: (message: Message) => JSX.Element;
}

type SetMessagesAction = Dispatch<SetStateAction<Message[]>>;

type MessageUpdater = (messages: Message[]) => Message[];

// Add this with the other interfaces at the top
interface CreateConversationResponse {
  conversationId: string;
  title?: string;
  createdAt?: string;
}

// Message response interfaces
interface MessageResponse {
  content?: string;
  agentResponse?: string;
  conversationId: string;
  createdAt: string;
  messages?: Array<{
    id?: string;
    role: Role;
  content: string;
    conversationId?: string;
    createdAt?: string;
  }>;
}

interface MessagesResponse {
  messages: Message[];
  warning?: string;
  error?: string;
}

// Add this interface near the top of the file with the other interfaces
interface AgentMessagesResponse {
  messages: Array<{
    id: string;
    conversationId: string;
    role: Role;
    content: string;
    createdAt: string;
    isLoading?: boolean;
  }>;
  warning?: string | null;
  error?: string | null;
}

// Add the ApiResponseData type definition at the top of the file with other type definitions
interface ApiResponseData {
  id?: string;
  agentResponse?: string;
  content?: string;
  createdAt?: string;
  conversationId?: string;
}

// Define props for ChatWindow
interface ChatWindowProps {
  showKnowledgePanel: boolean;
  currentConversation: Conversation | null;
  setStoreMessages: Dispatch<SetStateAction<Message[]>>;
  storeMessages: Message[];
}

interface SendMessageParams {
  conversationId: string;
  userQuery: string;
  managerType: ManagerType;
  temperature: number;
}

// Enhance the sendMessage function to include more message history
const sendMessage = async (conversationId: string, userQuery: string, managerType: ManagerType, temperature: number) => {
  try {
    // Log the request parameters for debugging
    console.log('SendMessage API call with params:', {
      conversationId,
      messageLength: userQuery.length,
      managerType,
      temperature
    });

    // Add extra request parameter to include more context
    const response = await api.post<MessageResponse>('/api/v1/conversation/message', {
      conversationId,
      userQuery,
      managerType,
      temperature: temperature || 0.7,
      includeHistory: true, // Add this parameter to request full history
      historyLimit: 20 // Request at least 20 previous messages for context
    });

    if (!response.data) {
      throw new Error('Empty response from API');
    }

    // Handle both new and old response formats
    const messageContent = response.data.content || response.data.agentResponse;
    if (!messageContent) {
      throw new Error('No message content in response');
    }

    return {
      ...response.data,
      content: messageContent
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Define the expected structure of the agent's response
interface AgentMessageResponse {
  messages: Message[];
}

// Define a type for the expanded sections state
interface ExpandedSectionsState {
  [messageId: string]: string[]; // messageId maps to an array of expanded section keys for that message
}

// Define a type for the active feedback section state
interface ActiveFeedbackSectionState {
  [messageId: string]: string | null; // messageId maps to the key of the active section or null
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ showKnowledgePanel, currentConversation, setStoreMessages, storeMessages }) => {
  const { 
    setCurrentConversation,
    temperature,
    darkMode,
    messages,
    setMessages,
    addMessage,
    managerType,
    user,
    setUser
  } = useStore();
  
  // Add state for scenario selection modal
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  
  // Add state for tactics modal
  const [showTacticsModal, setShowTacticsModal] = useState(false);
  
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Add state for practice mode
  const [practiceMode, setPracticeMode] = useState(false);
  const [activeManagerType, setActiveManagerType] = useState<string | undefined>(undefined);
  
  // Add a ref to track if feedback is being processed
  const isProcessingFeedback = useRef(false);
  
  // Add state to track if we're currently processing an email draft request
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  // Ref to prevent multiple clicks
  const isProcessingOption = useRef(false);
  
  // Enhanced Email Assistant State
  const [emailAssistantActive, setEmailAssistantActive] = useState(false);
  const [emailDraftData, setEmailDraftData] = useState({
    tone: '',
    concern: '',
    address: '',
    references: [] as string[],
    action: '',
    originalEthicalIssue: ''
  });

  // Add state for scenario transition
  const [showScenarioTransition, setShowScenarioTransition] = useState(false);
  
  // Add state to track copied emails
  const [copiedEmails, setCopiedEmails] = useState<Set<string>>(new Set());
  const [currentEmailQuestion, setCurrentEmailQuestion] = useState(0);
  const [emailQuestionResponses, setEmailQuestionResponses] = useState<string[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<{ [questionIndex: number]: string }>({});
  
  // Email Assistant Questions - Meta-communication focused
  const emailQuestions = [
    {
      id: 'tone',
      question: "What tone would you like this email to have?",
      type: 'choice' as const,
      choices: ['Confident and assertive', 'Polite but firm', 'Curious and questioning', 'Formal and diplomatic', 'Friendly and open']
    },
    {
      id: 'address',
      question: "How would you like to address the manager?",
      type: 'choice',
      choices: ['By name (e.g., "Hi James")', 'General ("Hi team")', 'No greeting, go straight to the point', 'You decide (let EVA pick)']
    },
    {
      id: 'goal',
      question: "What's your main goal with this email?",
      type: 'choice',
      choices: ['Ask for a meeting', 'Raise concern for documentation', 'Escalate to someone higher up', 'Recommend an alternative approach', 'Just express disagreement respectfully']
    },
    {
      id: 'references',
      question: "Should I include references to existing policies or frameworks?",
      type: 'choice',
      choices: ['Yes', 'No']
    },
    {
      id: 'customization',
      question: "Is there anything you definitely want to say or avoid?",
      type: 'text',
      placeholder: "e.g., I want to avoid sounding too aggressive, or I want to include a line about users being left out... (optional)"
    }
  ];
  
  // State for Edit Draft Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [draftToEdit, setDraftToEdit] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null); // Keep track of which message is being edited
  
  // Create a ref to the handleSendMessage function to use in the useEffect
  const handleSendMessageRef = useRef<(content: string) => Promise<void>>();
  
  // Email Assistant Functions
  const startEmailAssistant = (originalEthicalIssue: string) => {
    setEmailAssistantActive(true);
    setCurrentEmailQuestion(0);
    setEmailQuestionResponses([]);
    setSelectedChoices({});
    setEmailDraftData({
      tone: '',
      concern: '',
      address: '',
      references: [],
      action: '',
      originalEthicalIssue
    });
    

    
    // Add EVA's first question as a message
    const evaMessage: Message = {
      id: `eva-email-${Date.now()}`,
      role: 'assistant' as Role,
      content: "Let's get your email ready. " + emailQuestions[0].question,
      conversationId: currentConversation?.conversationId || '',
      createdAt: new Date().toISOString(),
      isEmailAssistant: true,
      emailQuestionIndex: 0
    };
    
    setStoreMessages(prev => [...prev, evaMessage]);
  };
  
  const handleEmailQuestionResponse = async (response: string, isTextInput: boolean = false) => {
    // Mark choice as selected for choice questions
    if (!isTextInput) {
      setSelectedChoices(prev => ({ ...prev, [currentEmailQuestion]: response }));
    }
    
    // Add user's response as a message (only if not empty for text input)
    if (!isTextInput || response.trim()) {
      const userMessage: Message = {
        id: `user-email-${Date.now()}`,
        role: 'user' as Role,
        content: response || "(No specific preferences)",
        conversationId: currentConversation?.conversationId || '',
        createdAt: new Date().toISOString(),
        isEmailAssistant: true
      };
      
      setStoreMessages(prev => [...prev, userMessage]);
    }
    
    // Update responses array
    const newResponses = [...emailQuestionResponses, response];
    setEmailQuestionResponses(newResponses);
    
    // Update draft data based on current question
    const currentQ = emailQuestions[currentEmailQuestion];
    const updatedDraftData = { ...emailDraftData };
    
    switch (currentQ.id) {
      case 'tone':
        updatedDraftData.tone = response;
        break;
      case 'address':
        updatedDraftData.address = response;
        break;
      case 'goal':
        updatedDraftData.action = response; // Store goal in action field
        break;
      case 'references':
        updatedDraftData.references = response === 'Yes' ? ['Will include relevant frameworks'] : [];
        break;
      case 'customization':
        updatedDraftData.concern = response || 'Use best practices'; // Store customization input (can be empty)
        break;
    }
    
    setEmailDraftData(updatedDraftData);
    
    // No follow-up questions needed anymore
    
    // Move to next question or finish
    const nextQuestionIndex = currentEmailQuestion + 1;
    
    if (nextQuestionIndex < emailQuestions.length) {
      setCurrentEmailQuestion(nextQuestionIndex);
      
      // Add next question after a brief delay
      setTimeout(() => {
        const nextMessage: Message = {
          id: `eva-email-${Date.now()}`,
          role: 'assistant' as Role,
          content: emailQuestions[nextQuestionIndex].question,
          conversationId: currentConversation?.conversationId || '',
          createdAt: new Date().toISOString(),
          isEmailAssistant: true,
          emailQuestionIndex: nextQuestionIndex
        };
        
        setStoreMessages(prev => [...prev, nextMessage]);
      }, 500);
    } else {
      // All questions answered, generate the email
      await generateFinalEmail();
    }
  };
  
  const generateFinalEmail = async () => {
    // Show summary and generate button
    const summaryMessage: Message = {
      id: `eva-email-summary-${Date.now()}`,
      role: 'assistant' as Role,
      content: "Perfect! Here's what I've gathered:\n\n" +
        `• **Tone**: ${emailDraftData.tone}\n` +
        `• **Address style**: ${emailDraftData.address}\n` +
        `• **Main goal**: ${emailDraftData.action}\n` +
        `• **Include references**: ${emailDraftData.references.length > 0 ? 'Yes' : 'No'}\n` +
        `• **Customization**: ${emailDraftData.concern || 'Use best practices'}\n\n` +
        "Ready to generate your email?",
      conversationId: currentConversation?.conversationId || '',
      createdAt: new Date().toISOString(),
      isEmailAssistant: true,
      isEmailSummary: true
    };
    
    setStoreMessages(prev => [...prev, summaryMessage]);
  };
  
  const generateEmailWithData = async () => {
    setEmailAssistantActive(false);
    setIsDraftingEmail(true);
    
    // Create loading message
    const loadingMessage: Message = {
      id: `assistant-loading-${Date.now()}`,
      role: 'assistant' as Role,
      content: 'Generating your personalized email...',
      conversationId: currentConversation?.conversationId || '',
      createdAt: new Date().toISOString(),
      isLoading: true
    };
    
    setStoreMessages(prev => [...prev, loadingMessage]);
    
    // Create enhanced prompt with collected data
    const currentScenario = determineCurrentScenario();
    const scenarioContext = currentScenario === 'accessibility' ? 'accessibility' : 
                           currentScenario === 'privacy' ? 'privacy' : 'ethical';
    
    // Determine appropriate references based on scenario
    const relevantReferences = currentScenario === 'accessibility' 
      ? 'WCAG guidelines, ADA compliance, Section 508' 
      : currentScenario === 'privacy'
      ? 'GDPR, CCPA, company privacy policy'
      : 'company ethics policy, industry standards';
    
    const enhancedPrompt = `Generate a professional email based on the user's communication preferences and scenario context:

**Scenario Context**: This email addresses ${scenarioContext} concerns from a workplace ethical situation the user just practiced.

**Original Ethical Issue**: ${emailDraftData.originalEthicalIssue}

**Communication Preferences**:
- Tone: ${emailDraftData.tone}
- Address style: ${emailDraftData.address}
- Main goal: ${emailDraftData.action}
- Include policy references: ${emailDraftData.references.length > 0 ? `Yes (suggest: ${relevantReferences})` : 'No'}
- User customization: ${emailDraftData.concern || 'Use professional best practices'}

**Instructions**: 
Generate a well-structured email that reflects the specified tone and communication style. The email should address the ${scenarioContext} concerns professionally while achieving the stated goal. ${emailDraftData.references.length > 0 ? `Include appropriate references to ${relevantReferences} to strengthen the argument.` : ''} ${emailDraftData.concern && emailDraftData.concern !== 'Use best practices' && emailDraftData.concern !== 'Keep it simple and brief' ? `Important: ${emailDraftData.concern}` : ''}

Format: Include subject line, greeting (based on address style), body paragraphs, and professional closing.`;
    
    try {
      const response = await api.post<AgentMessagesResponse>('/api/v1/conversation/message', {
        conversationId: currentConversation?.conversationId,
        userQuery: enhancedPrompt,
        managerType: currentConversation?.managerType || managerType,
        temperature: temperature || 0.7,
        includeHistory: true,
        historyLimit: 20
      });
      
      setStoreMessages(prev => prev.filter(m => !m.isLoading));
      
      if (response.data && response.data.messages && response.data.messages.length > 0) {
        const assistantResponse = response.data.messages[response.data.messages.length - 1];
        
        const newAssistantMessage: Message = {
          id: assistantResponse.id || `assistant-${Date.now()}`,
          role: 'assistant' as Role,
          content: assistantResponse.content,
          conversationId: currentConversation?.conversationId || '',
          createdAt: assistantResponse.createdAt || new Date().toISOString()
        };
        
        setStoreMessages(prev => [...prev.filter(m => !m.isLoading), newAssistantMessage]);
        
        if (currentConversation?.conversationId) {
          saveConversationState(currentConversation.conversationId, 
            [...storeMessages.filter(m => !m.isLoading), newAssistantMessage]);
        }
      }
    } catch (error) {
      console.error('Error generating email:', error);
      setStoreMessages(prev => prev.filter(m => !m.isLoading));
      setError('Failed to generate email. Please try again.');
    } finally {
      setIsDraftingEmail(false);
    }
  };
  
  // Add this state and ref near the other refs and state declarations
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Track if a message is being sent to prevent auto-recovery
  const isMessageSending = useRef(false);

  // State for managing expanded accordion sections for ALL messages
  const [expandedMessageSections, setExpandedMessageSections] = useState<ExpandedSectionsState>({});
  const [activeMessageFeedbackSection, setActiveMessageFeedbackSection] = useState<ActiveFeedbackSectionState>({});

  // Add useEffect for feedback content styling
  useEffect(() => {
    // Add custom CSS for feedback formatting
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .feedback-content p {
        margin-bottom: 0.75rem;
        color: inherit;
      }
      .feedback-content ul, 
      .feedback-content ol {
        margin-left: 0;
        margin-bottom: 0.75rem;
        padding-left: 1.5rem;
      }
      .feedback-content ul {
        list-style-type: disc;
      }
      .feedback-content ol {
        list-style-type: decimal;
      }
      .feedback-content li {
        margin-bottom: 0.25rem;
        color: inherit;
        display: list-item;
        padding-left: 0.25rem;
      }
      .feedback-content ul li::marker {
        content: "•";
        font-size: 1.2em;
      }
      .feedback-content strong {
        font-weight: 600;
        color: inherit;
      }
      .feedback-content em {
        font-style: italic;
        color: inherit;
      }
      .dark .feedback-content p,
      .dark .feedback-content li,
      .dark .feedback-content {
        color: #e2e8f0;
      }
      .dark .feedback-content strong {
        color: #ffffff;
      }
      .light .feedback-content p,
      .light .feedback-content li,
      .light .feedback-content {
        color: #1a202c;
      }
      .light .feedback-content strong {
        color: #000000;
      }
      .introduction-text {
        color: inherit;
      }
      .dark .introduction-text {
        color: #e2e8f0;
      }
      .light .introduction-text {
        color: #1a202c;
      }
      .summary-content {
        color: inherit;
      }
      .dark .summary-content {
        color: #e2e8f0;
      }
      .light .summary-content {
        color: #1a202c;
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      // Clean up on unmount
      document.head.removeChild(styleEl);
    };
  }, []);

  // Add useEffect for animation styles
  useEffect(() => {
    // Add animation styles to document head
    const styleEl = document.createElement('style');
    styleEl.textContent = animationStyles;
    document.head.appendChild(styleEl);
    
    return () => {
      // Clean up on unmount
      document.head.removeChild(styleEl);
    };
  }, []);

  // Toggle function for accordion items (will be replaced or repurposed for new design)
  const toggleMessageSection = (messageId: string, sectionKey: string) => {
    // For the new design, this will set the active section
    setActiveMessageFeedbackSection(prev => ({
      ...prev,
      [messageId]: prev[messageId] === sectionKey ? null : sectionKey, // Toggle active section
    }));
  };

  // This handler might not be needed if we move away from Accordion's onValueChange
  const handleMessageAccordionValueChange = (messageId: string, value: string | string[] | undefined) => {
    // If we are using simple buttons, this might be deprecated.
    // For now, let's assume it might still be used if a single section is shown/hidden.
    let newActiveSection: string | null = null;
    if (typeof value === 'string') {
      newActiveSection = value;
    } else if (Array.isArray(value) && value.length > 0) {
      newActiveSection = value[0]; // If multiple, just take the first for active display
    }
    setActiveMessageFeedbackSection(prev => ({
      ...prev,
      [messageId]: newActiveSection,
    }));
  };

  // Set the ref value whenever loading changes
  useEffect(() => {
    isMessageSending.current = loading;
  }, [loading]);

  // Replace the existing scroll useEffect with this smarter version
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      // Use requestAnimationFrame to ensure DOM updates before scrolling
      requestAnimationFrame(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [storeMessages, shouldAutoScroll, loading]);

  // Update the scroll handler for better detection of user scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Only auto-scroll if user is already at or near the bottom
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollBottom = scrollTop + clientHeight;
      const isNearBottom = scrollBottom >= scrollHeight - 150; // More generous threshold
      
      if (isNearBottom !== shouldAutoScroll) {
        setShouldAutoScroll(isNearBottom);
        console.log(`Auto-scroll ${isNearBottom ? 'enabled' : 'disabled'} - user is ${isNearBottom ? 'near' : 'away from'} bottom`);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    
    // Also check scroll position after content changes
    const checkScrollPositionAfterUpdate = () => {
      requestAnimationFrame(handleScroll);
    };
    
    // Run on initial load and whenever messages change
    checkScrollPositionAfterUpdate();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [storeMessages.length, shouldAutoScroll]);
  
  // Force scroll to bottom when sending a new message
  useEffect(() => {
    if (loading) {
      // When loading a new message, force scroll to bottom
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShouldAutoScroll(true);
      });
    }
  }, [loading]);

  // Add utility functions for state preservation
  const saveConversationState = (conversationId: string, messages: Message[]) => {
    if (!conversationId) return;
    
    try {
      // Filter out any temporary loading messages
      const cleanMessages = messages.filter(m => !m.isLoading);
      
      // Only save if we have actual messages
      if (cleanMessages.length > 0) {
        const messageData = JSON.stringify(cleanMessages);
        
        // Save to multiple formats for redundancy
        localStorage.setItem(`messages_${conversationId}`, messageData);
        localStorage.setItem(`messages-${conversationId}`, messageData);
        localStorage.setItem(`backup_messages_${conversationId}`, messageData);
        localStorage.setItem(`backup-messages-${conversationId}`, messageData);
        localStorage.setItem(`exact_messages_${conversationId}`, messageData);
        
        console.log(`Saved ${cleanMessages.length} messages for conversation ${conversationId}`);
      }
    } catch (e) {
      console.error('Failed to save conversation state:', e);
    }
  };
  
  const loadConversationState = (conversationId: string): Message[] | null => {
    if (!conversationId) return null;
    
    try {
      // Try all possible key formats for backward compatibility
      const keyFormats = [
        `messages_${conversationId}`,
        `messages-${conversationId}`,
        `backup_messages_${conversationId}`,
        `backup-messages-${conversationId}`
      ];
      
      for (const key of keyFormats) {
        const savedState = localStorage.getItem(key);
        if (savedState) {
          const messages = JSON.parse(savedState);
          if (Array.isArray(messages) && messages.length > 0) {
            console.log(`Loaded ${messages.length} messages for conversation ${conversationId} from key ${key}`);
            return messages;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load conversation state:', e);
    }
    
    return null;
  };

  // Add conversation recovery to existing useEffect
  useEffect(() => {
    // Don't fetch if feedback is being processed
    if (isProcessingFeedback.current) {
      console.log('Skipping fetchMessages because feedback is processing.');
      return;
    }
    
    if (!currentConversation) {
      console.log('No current conversation, skipping message fetch');
        return;
      }
    
    console.log('Current conversation changed to:', currentConversation.conversationId);
      
    // Try to recover messages from localStorage first
    if (currentConversation.conversationId) {
      const recoveredMessages = loadConversationState(currentConversation.conversationId);
      if (recoveredMessages && recoveredMessages.length > 0) {
        console.log('Recovered messages from localStorage for conversation', currentConversation.conversationId);
        setMessages(recoveredMessages);
        setStoreMessages(recoveredMessages); // Also update storeMessages to ensure UI reflects state
        return;
      } else {
        console.log('No messages in localStorage for conversation', currentConversation.conversationId);
      }
      }
      
    // Don't fetch messages for draft conversations
    if (currentConversation.conversationId.startsWith('draft-')) {
      console.log('Draft conversation, not fetching messages');
        return;
      }

    // For real conversations with no recovered messages, fetch from API
    console.log('Fetching messages from API for conversation', currentConversation.conversationId);
    fetchMessages();
  }, [currentConversation?.conversationId]);

  // Add debug logging
  useEffect(() => {
    console.log('Current conversation:', currentConversation);
    console.log('Store messages:', storeMessages);
    console.log('Messages length:', messages.length);
  }, [currentConversation, storeMessages, messages.length]);

  const fetchMessages = async () => {
    console.log('Fetching messages for conversation:', currentConversation?.conversationId);
    
    if (!currentConversation || currentConversation.conversationId.startsWith('draft-')) {
      console.log('Skipping message fetch - no conversation or draft conversation');
        return;
      }

    setIsRefreshing(true);
            setError(null);

    try {
      // Try to get messages from localStorage first
      const cachedMessages = loadConversationState(currentConversation.conversationId);
      if (cachedMessages && cachedMessages.length > 0) {
        console.log('Using cached messages from localStorage');
        setMessages(cachedMessages);
        setStoreMessages(cachedMessages); // Also update storeMessages to ensure UI displays correctly
        setIsRefreshing(false);
        return;
      }

      // Log API request attempt
      console.log('Attempting to fetch messages from API...');
      
      try {
        // The backend returns an array of ConversationContentResponseDTO, not a MessagesResponse object
        const response = await api.get<ConversationContentResponseDTO[]>(`/api/v1/conversation/message/${currentConversation.conversationId}`);
        console.log('API Response raw data:', response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          // Add more detailed logging for debugging
          response.data.forEach((dto, index) => {
            console.log(`Message ${index + 1} fields:`, {
              id: dto.id,
              role: dto.role,
              content: dto.content ? `${dto.content.substring(0, 50)}...` : 'undefined',
              userQuery: dto.userQuery ? `${dto.userQuery.substring(0, 50)}...` : 'undefined',
              agentResponse: dto.agentResponse ? `${dto.agentResponse.substring(0, 50)}...` : 'undefined',
              conversationId: dto.conversationId
            });
          });
          
          // Direct mapping from response array to Message[]
          const formattedMessages: Message[] = response.data.map(dto => ({
            id: dto.id || uuidv4(),
            role: dto.role as Role,
            content: dto.content || dto.userQuery || dto.agentResponse || '',
            conversationId: dto.conversationId || currentConversation.conversationId,
            createdAt: dto.createdAt || new Date().toISOString()
          }));

          console.log('Formatted messages:', formattedMessages);
          setMessages(formattedMessages);
          setStoreMessages(formattedMessages);
          
          // Save to localStorage for future use
          saveConversationState(currentConversation.conversationId, formattedMessages);
            } else {
          console.warn('No messages returned from API or empty array');
          setMessages([]);
          setStoreMessages([]);
        }
      } catch (apiError) {
        console.error('Error fetching from API:', apiError);
        setError('Failed to load messages from API. Please try again.');
        
        // Try one more time to recover from localStorage before giving up
        const lastResortMessages = loadConversationState(currentConversation.conversationId);
        if (lastResortMessages && lastResortMessages.length > 0) {
          console.log('API failed but recovered messages from localStorage');
          setMessages(lastResortMessages);
          setStoreMessages(lastResortMessages);
              } else {
          setMessages([]);
          setStoreMessages([]);
        }
      }
    } catch (error) {
      console.error('Error in fetchMessages function:', error);
      setError('Failed to load messages. Please try again.');
      setMessages([]);
      setStoreMessages([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add auto-recovery for messages - run more frequently and be more aggressive
  useEffect(() => {
    // Skip recovery if feedback is being processed
    if (isProcessingFeedback.current) {
      console.log('Auto-recovery skipped: practice feedback is processing');
      return;
    }
    
    // Check periodically if messages disappeared and recover them
    const intervalId = setInterval(() => {
      // Skip recovery if loading is true (message is being sent)
      if (isMessageSending.current) {
        console.log('Auto-recovery skipped: message is being sent');
        return;
      }
      
      if (currentConversation?.conversationId) {
        // Check if messages are empty or if storeMessages are empty
        if (messages.length === 0 || storeMessages.length === 0) {
          console.log('State check: messages are empty! Attempting recovery...');
          const recoveredMessages = loadConversationState(currentConversation.conversationId);
          if (recoveredMessages && recoveredMessages.length > 0) {
            console.log('Auto-recovery: found and restored', recoveredMessages.length, 'messages');
            setMessages(recoveredMessages);
            setStoreMessages(recoveredMessages);
          } else if (!currentConversation.conversationId.startsWith('draft-')) {
            // If no messages in localStorage and not a draft, try API
            console.log('No messages in localStorage, forcing API refresh');
            fetchMessages();
          }
        } else if (messages.length > 0 && storeMessages.length === 0) {
          // Fix state sync issues between messages and storeMessages
          console.log('Syncing storeMessages with messages');
          setStoreMessages([...messages]);
        } else if (storeMessages.length > 0 && messages.length === 0) {
          // Fix state sync issues between messages and storeMessages
          console.log('Syncing messages with storeMessages');
          setMessages([...storeMessages]);
        }
      }
    }, 1000); // Check every second for more responsive recovery
    
    return () => clearInterval(intervalId);
  }, [currentConversation?.conversationId, messages.length, storeMessages.length]);

  // Update the useEffect for checking practice feedback in localStorage
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Practice feedback check skipped: feedback is processing');
      return;
    }
    
    // Check for practice data that needs to be displayed in the current conversation
    const checkForPracticeFeedback = () => {
      const practiceToChat = localStorage.getItem('practice_to_chat') === 'true';
      const feedbackPrompt = localStorage.getItem('feedbackRequest') || localStorage.getItem('practice_feedback_prompt');
      const returningFromPractice = localStorage.getItem('returning_from_practice') === 'true';
      
      // Log all practice-related data for debugging
      console.log('Practice feedback check:', {
        practiceToChat,
        hasFeedbackPrompt: !!feedbackPrompt,
        returningFromPractice,
        currentConversationId: currentConversation?.conversationId
      });
      
      // If we have a returning_from_practice flag and a current conversation
      if (returningFromPractice && currentConversation?.conversationId) {
        console.log('Processing returning from practice...');
        
        // Load existing messages for this conversation to ensure we don't lose them
        const existingMessages = loadConversationState(currentConversation.conversationId) || [];
        
        if (existingMessages.length > 0) {
          console.log(`Loaded ${existingMessages.length} existing messages from conversation`);
          setMessages(existingMessages);
          setStoreMessages(existingMessages);
        }
        
        // Clear the flag after processing
        localStorage.removeItem('returning_from_practice');
      }
      
      // If we find evidence of a pending practice feedback request
      if (practiceToChat && feedbackPrompt && !isProcessingFeedback.current) {
        console.log('Found practice feedback request, processing...');
        
        // Make sure we've loaded existing messages before processing feedback
        const currentConvId = currentConversation?.conversationId;
        if (currentConvId) {
          // Try to load existing messages if the current message list is empty
          if (messages.length === 0) {
            const existingMessages = loadConversationState(currentConvId);
            if (existingMessages && existingMessages.length > 0) {
              console.log(`Loaded ${existingMessages.length} existing messages before processing feedback`);
              setMessages(existingMessages);
              setStoreMessages(existingMessages);
            }
          }
        }
        
        // Trigger feedback processing
        setTimeout(() => {
          const event = new Event('practice-feedback-request');
          window.dispatchEvent(event);
        }, 500); // Small delay to ensure messages are loaded first
      }
    };
    
    // Run the check once when the component mounts or conversation changes
    checkForPracticeFeedback();
    
    // Set up interval to check for feedback requests
    const checkInterval = setInterval(checkForPracticeFeedback, 2000);
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [currentConversation?.conversationId, messages.length]);

  // Update the convertToMessage function to handle multiple content field possibilities
  const convertToMessage = (dto: ConversationContentResponseDTO): Message => {
    // First try to get content from various possible fields
    const content = dto.content || dto.agentResponse || dto.userQuery || '';
    
    return {
      id: dto.id || uuidv4(),
      role: dto.role || (dto.userQuery ? 'user' : 'assistant'),
      content: content,
      conversationId: dto.conversationId,
      createdAt: dto.createdAt || new Date().toISOString()
    };
  };

  // Enhance the triggerSidebarRefresh function to include more detail
  const triggerSidebarRefresh = (details?: { type: string, conversationId?: string, title?: string }) => {
    // Include default title and conversationId from current conversation if not provided
    const enhancedDetails = {
      type: details?.type || 'general-refresh',
      conversationId: details?.conversationId || currentConversation?.conversationId,
      title: details?.title || currentConversation?.title || 'New Conversation'
    };
    
    // Create and dispatch a custom event to notify the sidebar to refresh conversations
    const refreshEvent = new CustomEvent('refresh-conversations', { 
      detail: enhancedDetails
    });
    window.dispatchEvent(refreshEvent);
    console.log('Dispatched refresh-conversations event with details:', enhancedDetails);
  };

  // Simplify message handling to ensure user messages remain visible
  const handleSendMessage = useCallback(async (inputValue: string, skipUserMessageUI: boolean = false) => {
    console.log("handleSendMessage called with input:", inputValue);
    console.log("Current Conversation before send:", currentConversation);

    // Trim the input value
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // ** Get user ID from the store **
    const userId = useStore.getState().user?.id;

    // ** Add check for userId **
    if (!userId) {
      console.error("Cannot send message: User not authenticated.");
      setError("You must be logged in to send messages.");
      setLoading(false); // Ensure loading indicator is turned off
      return; // Stop execution if no user ID
    }

    isMessageSending.current = true;
    setLoading(true); // Fix: Use setLoading
    setError(null);

    // Initialize local variables first
    let currentConv = currentConversation; // Work with a local copy
    let conversationId = currentConv?.conversationId;
    let isPersisted = currentConv?.isPersisted ?? false;

    // CRITICAL FIX: Add validation for current conversation state
    // Check if we need to recover the conversation state
    if (localStorage.getItem('originalConversationId') && (!currentConversation || !currentConversation.conversationId || currentConversation.conversationId.startsWith('draft-'))) {
      const originalConversationId = localStorage.getItem('originalConversationId');
      console.log('Attempting to recover conversation from originalConversationId:', originalConversationId);
      
      try {
        // Try to fetch the conversation from the API
        const response = await api.get(`/api/v1/conversation/${originalConversationId}`);
        if (response.data) {
          // Restore the conversation
          console.log('Recovered conversation from API:', response.data);
          
          // Update currentConv with recovered data
          currentConv = {
            conversationId: response.data.id,
            title: response.data.title || 'Recovered Conversation',
            managerType: response.data.managerType || 'PUPPETEER',
            createdAt: response.data.createdAt || new Date().toISOString(),
            isPersisted: true
          };
          
          // Update conversationId and isPersisted
          conversationId = currentConv.conversationId;
          isPersisted = true;
          
          // Also update the store
          setCurrentConversation({...currentConv});
          
          console.log('Successfully restored conversation state');
        }
      } catch (err) {
        console.error('Failed to recover conversation:', err);
      }
    }
    
    // Now continue with the rest of the function using the potentially updated currentConv, conversationId, etc.
    try {
      // --- Draft Conversation Handling --- 
      // IMPORTANT FIX: Only create a new conversation if we truly don't have one
      // Check if we actually need a new conversation (not just if conversationId exists)
      if ((!conversationId || conversationId.startsWith('draft-') || !isPersisted) && 
          !(currentConv && currentConv.conversationId && !currentConv.conversationId.startsWith('draft-'))) {
        console.log('Sending first message for a draft conversation. Creating on backend first...');

        // Generate title from the first message
        const titleForNewConv = trimmedValue.substring(0, 35) + (trimmedValue.length > 35 ? '...' : '');
        console.log(`Generated initial title: ${titleForNewConv}`);

        try {
          const activeManagerType = managerType || 'PUPPETEER';
          // Pass the generated title to the agent creation call
          const persistedConvData = await agentCreateConversation(
            userId, // ** Pass the retrieved userId **
            managerType, // Pass managerType from state
            undefined // Explicitly pass undefined for title if none is provided
          );
          
          if (!persistedConvData || !persistedConvData.conversationId) {
            throw new Error('Agent did not return a valid conversation ID.');
          }

          conversationId = persistedConvData.conversationId;
          isPersisted = true;
          
          // Create the new conversation object for the store, using the generated title
          const newPersistedConversation: Conversation = {
            ...persistedConvData,
            conversationId: conversationId, 
            isDraft: false,
            isPersisted: true,
            managerType: persistedConvData.managerType || activeManagerType,
            title: titleForNewConv, // Use generated title immediately
            createdAt: persistedConvData.createdAt || new Date().toISOString(),
          };
          
          // Set the current conversation state immediately
          setCurrentConversation(newPersistedConversation);
          currentConv = newPersistedConversation;

          console.log('Draft conversation successfully persisted with ID:', conversationId, 'and Title:', newPersistedConversation.title);
          
          // Trigger sidebar refresh immediately with the new title
          triggerSidebarRefresh({ 
              type: 'new-conversation', 
              conversationId: conversationId, 
              title: newPersistedConversation.title 
          });

        } catch (createError: any) {
          console.error('Failed to create/persist draft conversation on backend:', createError);
          setError('Error saving conversation. Please try again.');
          setLoading(false);
          isMessageSending.current = false;
          return;
        }
      } else {
        // IMPROVEMENT: Add logging for when we're using an existing conversation
        console.log('Using existing conversation with ID:', conversationId, 'Maintaining conversation context');
      }
      // --- End Draft Conversation Handling ---
      
      // IMPROVED: More robust conversation state validation
      if (!conversationId || !isPersisted) {
        console.warn('Conversation state invalid, attempting comprehensive recovery...');
        
        // Try multiple recovery strategies
        const originalConversationId = localStorage.getItem('originalConversationId');
        const currentConversationId = localStorage.getItem('current-conversation-id');
        
        // Strategy 1: Use originalConversationId if available
        if (originalConversationId) {
          console.log('Attempting recovery using originalConversationId:', originalConversationId);
          try {
            const response = await api.get(`/api/v1/conversation/${originalConversationId}`);
            if (response.data && response.data.id) {
              conversationId = response.data.id;
              isPersisted = true;
              
              // Update the current conversation in the store
              const recoveredConversation = {
                conversationId: response.data.id,
                title: response.data.title || 'Recovered Conversation',
                managerType: response.data.managerType || managerType || 'PUPPETEER',
                isPersisted: true,
                createdAt: response.data.createdAt || new Date().toISOString()
              };
              
              setCurrentConversation(recoveredConversation);
              currentConv = recoveredConversation;
              console.log('Successfully recovered conversation using originalConversationId');
            }
          } catch (err) {
            console.warn('Failed to recover using originalConversationId:', err);
          }
        }
        
        // Strategy 2: Use current-conversation-id if Strategy 1 failed
        if ((!conversationId || !isPersisted) && currentConversationId && currentConversationId !== originalConversationId) {
          console.log('Attempting recovery using current-conversation-id:', currentConversationId);
          try {
            const response = await api.get(`/api/v1/conversation/${currentConversationId}`);
            if (response.data && response.data.id) {
              conversationId = response.data.id;
              isPersisted = true;
              
              // Update the current conversation in the store
              const recoveredConversation = {
                conversationId: response.data.id,
                title: response.data.title || 'Recovered Conversation',
                managerType: response.data.managerType || managerType || 'PUPPETEER',
                isPersisted: true,
                createdAt: response.data.createdAt || new Date().toISOString()
              };
              
              setCurrentConversation(recoveredConversation);
              currentConv = recoveredConversation;
              console.log('Successfully recovered conversation using current-conversation-id');
            }
          } catch (err) {
            console.warn('Failed to recover using current-conversation-id:', err);
          }
        }
        
        // Strategy 3: Create a new conversation if all recovery attempts failed
        if (!conversationId || !isPersisted) {
          console.log('All recovery attempts failed, creating new conversation...');
          try {
            const titleForNewConv = trimmedValue.substring(0, 35) + (trimmedValue.length > 35 ? '...' : '');
            const activeManagerType = managerType || 'PUPPETEER';
            
            const persistedConvData = await agentCreateConversation(
              userId,
              activeManagerType,
              undefined
            );
            
            if (persistedConvData && persistedConvData.conversationId) {
              conversationId = persistedConvData.conversationId;
              isPersisted = true;
              
              const newPersistedConversation: Conversation = {
                ...persistedConvData,
                conversationId: conversationId,
                isDraft: false,
                isPersisted: true,
                managerType: persistedConvData.managerType || activeManagerType,
                title: titleForNewConv,
                createdAt: persistedConvData.createdAt || new Date().toISOString(),
              };
              
              setCurrentConversation(newPersistedConversation);
              currentConv = newPersistedConversation;
              
              console.log('Successfully created new conversation as fallback:', conversationId);
              
              // Trigger sidebar refresh
              triggerSidebarRefresh({ 
                type: 'new-conversation', 
                conversationId: conversationId, 
                title: newPersistedConversation.title 
              });
            }
          } catch (createError: any) {
            console.error('Failed to create fallback conversation:', createError);
            setError('Unable to create conversation. Please refresh the page and try again.');
            setLoading(false);
            isMessageSending.current = false;
            return;
          }
        }
        
        // Final validation - this should now always pass
        if (!conversationId || !isPersisted) {
          console.error('Conversation state could not be recovered after all attempts');
          setError('Unable to establish conversation context. Please refresh the page and try again.');
          setLoading(false);
          isMessageSending.current = false;
          return;
        }
      }

      // DISABLED: Redundant validation - comprehensive validation above handles all cases
      // if (!conversationId || !isPersisted) {
      //    console.error('Cannot send message: No valid persisted conversation ID.');
      //    setError('Cannot send message. Invalid conversation state.');
      //    setLoading(false);
      //    isMessageSending.current = false;
      //    return;
      // }

      // Add debug logging for conversation tracking
      console.log("Message history tracking:", {
        conversationId,
        existingMessages: storeMessages.length,
        messagePreview: storeMessages.slice(-3).map(m => ({
          role: m.role,
          preview: m.content.substring(0, 30) + (m.content.length > 30 ? '...' : '')
        }))
      });

    // IMPORTANT: Create a snapshot of the current messages to avoid state issues
    const currentMessagesSnapshot = [...storeMessages];

      // Create user message variable outside the if block so it's accessible throughout the function
      let userMessageId: string | undefined;
      
      // 1. Create and immediately display the user message, unless skipUserMessageUI is true
      if (!skipUserMessageUI) {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user' as Role,
      content: trimmedValue,
        conversationId: conversationId, // Use the (potentially updated) real ID
      createdAt: new Date().toISOString()
    };
        
        // Store the ID for later reference
        userMessageId = userMessage.id;
    
    // Add to UI immediately - use functional update to ensure latest state
    setStoreMessages(prev => [...prev, userMessage]);
    
    // Save to localStorage immediately to preserve user message
      saveConversationState(conversationId, [...currentMessagesSnapshot, userMessage]);
      }
    
    // 2. Add a loading message
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant' as Role,
      content: 'Thinking...',
        conversationId: conversationId, // Use the real ID
      createdAt: new Date().toISOString(),
      isLoading: true
    };

    // Add loading message to UI state
    setStoreMessages(prev => [...prev.filter(m => !m.isLoading), loadingMessage]);

      // 3. Send message to the AGENT API (using the real conversationId)
      const activeManagerType = currentConv?.managerType || managerType || 'PUPPETEER' as ManagerType;
            
      // IMPROVEMENT: Extra check to confirm we're using the correct conversation ID
      if (currentConv && currentConv.conversationId && conversationId !== currentConv.conversationId) {
        console.log('Detected conversation ID mismatch. Correcting from:', conversationId, 'to:', currentConv.conversationId);
        conversationId = currentConv.conversationId;
      }
      
      // Additional check for originalConversationId in localStorage (important for simulation/practice flows)
      const originalConversationId = localStorage.getItem('originalConversationId');
      if (originalConversationId && (conversationId === undefined || conversationId === null || conversationId.startsWith('draft-'))) {
        console.log('Found originalConversationId in localStorage. Using it instead of:', conversationId);
        
        try {
          // Try to retrieve the conversation from backend
          const response = await api.get(`/api/v1/conversation/${originalConversationId}`);
          if (response.data && response.data.id) {
            console.log('Successfully retrieved original conversation from API:', response.data.id);
            
            // Update our conversation ID
            conversationId = response.data.id;
            isPersisted = true;
            
            // Update the current conversation in the store for future messages
            const recoveredConversation = {
              conversationId: response.data.id,
              title: response.data.title || 'Recovered Conversation',
              managerType: response.data.managerType || activeManagerType,
              isPersisted: true,
              createdAt: response.data.createdAt || new Date().toISOString()
            };
            
            // Update the store and local working copy
            setCurrentConversation(recoveredConversation);
            currentConv = recoveredConversation;
            
            console.log('Successfully restored conversation state for messaging');
          }
        } catch (err) {
          console.error('Failed to recover conversation from originalConversationId:', err);
          // Continue with current values, don't return/exit
        }
      }
      
      // Special handling for "how would I respond" type questions after simulations
      if (trimmedValue.toLowerCase().includes('how would i respond') && 
          localStorage.getItem('originalConversationId') === conversationId) {
        console.log('Detected "how would I respond" question after simulation - ensuring same conversation context');
        // No need to do anything special, the prior code fixes ensure we use the same conversation ID
      }
            
      console.log('Sending message to AGENT API:', {
        conversationId,
        userQuery: trimmedValue,
        managerType: activeManagerType,
        temperature
      });
      
      const agentPayload = {
          conversationId: conversationId,
          userQuery: trimmedValue, 
          managerType: activeManagerType,
        temperature: temperature,
        includeHistory: true, // Add this parameter to request full history
        historyLimit: 20 // Request more history for better context
      };
      
      // Explicitly type the expected response from the AGENT
      // It should now return the IDs for both messages
      interface AgentApiResponse {
          messages: [
              { id: string, role: 'user', content: string, conversationId: string, createdAt: string },
              { id: string, role: 'assistant', content: string, conversationId: string, createdAt: string }
          ]
      }
      
      const agentResponse = await agentApi.post<AgentApiResponse>('/api/v1/conversation/message', agentPayload);

      // Log response for debugging
      console.log('Agent API response received, messages length:', 
        agentResponse.data?.messages?.length || 0);

      const responseData = agentResponse.data;
      
      // Basic validation
      if (!responseData || !Array.isArray(responseData.messages) || responseData.messages.length < 2) {
          console.error("Invalid response structure from agent: Expected messages array with user and assistant entries", responseData);
          throw new Error("Invalid response structure from agent");
      }

      // Extract messages and IDs from agent response
      const userMessageFromAgent = responseData.messages.find(m => m.role === 'user');
      const agentMessageFromAgent = responseData.messages.find(m => m.role === 'assistant');

      if (!userMessageFromAgent || !agentMessageFromAgent || !userMessageFromAgent.id || !agentMessageFromAgent.id) {
          console.error("Missing user or assistant message or their IDs in agent response", responseData);
          throw new Error("Missing message data from agent response");
      }
      
      const finalUserMessage: Message = { ...userMessageFromAgent };
      const finalAgentMessage: Message = { ...agentMessageFromAgent, isLoading: false }; // Ensure isLoading is false

      // --- Update UI State --- 
      // Get the current messages *before* adding the agent response,
      // AND also filter out the *original* optimistic user message (using its temporary ID)
      const messagesBeforeAgentResponse = storeMessages.filter(
          m => m.id !== loadingMessage.id && 
              (!userMessageId || m.id !== userMessageId) // Only filter if userMessageId exists
      );
      
      // Also filter out any other assistant loading messages that might be present
      const messagesWithoutAnyLoading = messagesBeforeAgentResponse.filter(m => !m.isLoading);
      
      // Update UI state to include the final user message (with ID from agent) AND the final agent message
      setStoreMessages([...messagesWithoutAnyLoading, finalUserMessage, finalAgentMessage]); // Add BOTH back
      let finalMessagesForLocalStorage = [...messagesWithoutAnyLoading, finalUserMessage, finalAgentMessage];
      saveConversationState(conversationId, finalMessagesForLocalStorage);
      // --- End UI State Update --- 
      
      // --- Save Messages to Backend --- 
      // Now call the backend save endpoint for BOTH messages
      try {
        console.log('Calling backend to save user message');
        await saveMessage({
            conversationId: conversationId,
            messageId: finalUserMessage.id,
            content: finalUserMessage.content,
            role: 'user'
        });
        console.log('Calling backend to save assistant message');
        await saveMessage({
            conversationId: conversationId,
            messageId: finalAgentMessage.id,
            content: finalAgentMessage.content,
            role: 'assistant'
        });
      } catch (saveError) {
         // Log error but don't necessarily block UI
         console.error('Failed to save one or both messages to backend:', saveError);
         // Optionally update UI to show a save error?
         // setError('Failed to save message history.'); 
      }
      // --- End Save Messages --- 

      // Refresh sidebar (title update logic is now handled during conversation creation)
      triggerSidebarRefresh({
        type: 'new-message',
        conversationId: conversationId,
        title: currentConv?.title // Just use current title
      });

    } catch (error) {
      console.error('Error sending message or processing agent response:', error);
      // On error, remove loading message but keep user message
      setStoreMessages(prev => prev.filter(m => !m.isLoading));
      setError('Failed to send message or get response. Please try again.');
    } finally {
      // Ensure loading state is always turned off
      setLoading(false);
      isMessageSending.current = false;
    }
  }, [currentConversation, storeMessages, temperature, managerType, user, setStoreMessages, setCurrentConversation]); // Added dependencies

  // Update the ref whenever handleSendMessage changes
  useEffect(() => {
    // This ref pattern is not strictly necessary with useCallback, but keep if used elsewhere
    // handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]); // Dependency is handleSendMessage itself

  // Add a function to retrieve practice history in the ChatWindow component
  const getPracticeHistory = () => {
    try {
      const historyStr = localStorage.getItem('practice_history');
      if (!historyStr) return [];
      
      const history = JSON.parse(historyStr);
      return Array.isArray(history) ? history : [];
    } catch (e) {
      console.error('Error parsing practice history:', e);
      return [];
    }
  };

  // Function to check if user has completed at least one practice module
  const hasCompletedPractice = () => {
    const history = getPracticeHistory();
    return history.length > 0;
  };

  // Helper function to determine current scenario based on conversation content
  const determineCurrentScenario = (): 'accessibility' | 'privacy' | null => {
    // Look through messages to determine the scenario type
    const relevantMessages = storeMessages.filter(msg => 
      msg.role === 'user' && msg.content && msg.content.length > 20
    );
    
    for (const message of relevantMessages) {
      const content = message.content.toLowerCase();
      if (content.includes('accessibility') || content.includes('screen reader')) {
        return 'accessibility';
      }
      if (content.includes('privacy') || content.includes('location data')) {
        return 'privacy';
      }
    }
    
    return null;
  };

  // Function to refresh user data from API
  const refreshUserData = async () => {
    try {
      console.log('Refreshing user data after scenario completion...');
      const response = await backendApi.get('/api/v1/user/profile');
      const updatedUser = response.data;
      console.log('Updated user data:', updatedUser);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return null;
    }
  };

  // Complete replacement of the handlePracticeFeedbackRequest function with proper structure
    const handlePracticeFeedbackRequest = async () => {
    // Set processing flag at the very beginning
      isProcessingFeedback.current = true;
    console.log('Set isProcessingFeedback to true');
    
    try {
      console.log('Handling practice feedback request');
      console.log('Current conversation:', currentConversation);
      console.log('Current messages count:', messages.length);
      console.log('Current store messages count:', storeMessages.length);
      
      const practiceToChat = localStorage.getItem('practice_to_chat');
      
      if (practiceToChat === 'true') {
        console.log('Practice to chat flag is true');
        
        // If we have existing messages, log them for debugging
        if (messages.length > 0) {
          console.log('Existing messages before processing feedback:');
          messages.forEach((msg, idx) => {
            console.log(`Message ${idx}: ${msg.role}, content: ${msg.content.substring(0, 30)}...`);
          });
        } else {
          console.log('No existing messages found before processing feedback');
        }
          
        // IMPORTANT: Get both the simple prompt (for UI) and the detailed prompt (for API)
        const simplePrompt = localStorage.getItem('practice_feedback_simple') || localStorage.getItem('feedbackRequest');
        const detailedPrompt = localStorage.getItem('practice_feedback_prompt');
        
        // Use the simple prompt for the UI, but the detailed one for the API
        const displayPrompt = simplePrompt;
        const apiPrompt = detailedPrompt || simplePrompt; // Fallback to simple if detailed not available
        
        const practiceManagerType = (localStorage.getItem('practice_manager_type') as ManagerType) || managerType;
        
        // CRITICAL: Force using the original conversation ID
        const forcedConversationId = localStorage.getItem('force_conversation_id');
        const originalConvId = localStorage.getItem('originalConversationId');
        const conversationId = forcedConversationId || originalConvId;
                                 
        console.log('Determined conversation ID for feedback:', conversationId);
        console.log('Sources:', { forcedConversationId, originalConvId });
        
        if (!conversationId) {
          console.error('CRITICAL ERROR: Could not determine original conversation ID for feedback. Aborting.');
          // Clear flags to prevent loops
          isProcessingFeedback.current = false;
          localStorage.removeItem('practice_to_chat');
          localStorage.removeItem('practice_feedback_prompt');
          localStorage.removeItem('practice_feedback_simple');
          localStorage.removeItem('feedbackRequest');
          localStorage.removeItem('force_conversation_id');
          setError('Could not link feedback to the original conversation. Please start a new chat.');
          return; // Stop execution
        }
        
        // Set the current conversation to the target ID *before* doing anything else
        if (setCurrentConversation) {
          // Try to get existing conversation details if possible
          const conversationsJSON = localStorage.getItem('conversations');
          let existingTitle = "Conversation";
          let existingManager = practiceManagerType;
          let existingCreatedAt = new Date().toISOString();
          
          if (conversationsJSON) {
            try {
              const conversations = JSON.parse(conversationsJSON);
              const existingConvData = conversations.find((conv: any) => conv.conversationId === conversationId);
              if (existingConvData) {
                existingTitle = existingConvData.title || existingTitle;
                existingManager = existingConvData.managerType || existingManager;
                existingCreatedAt = existingConvData.createdAt || existingCreatedAt;
              }
            } catch (e) { 
              console.error('Error parsing conversations:', e); 
            }
          }
          
          console.log('Setting current conversation to original ID:', conversationId);
          setCurrentConversation({
            conversationId: conversationId,
            title: existingTitle,
            managerType: existingManager,
            createdAt: existingCreatedAt,
          });
        } else {
          console.error('setCurrentConversation function is not available!');
          // Even if we can't set it in the store, proceed with the ID we have
        }
        
        // Load existing messages for this conversation
        // Use a temporary variable to avoid state update delays
        let loadedMessages = loadConversationState(conversationId);
        if (loadedMessages && loadedMessages.length > 0) {
          console.log('Loaded existing messages for original conversation:', loadedMessages.length);
          // Update UI immediately if messages were loaded
          setMessages(loadedMessages);
          setStoreMessages(loadedMessages);
        } else {
          console.log('No stored messages found for original conversation, starting fresh.');
          loadedMessages = []; // Ensure it's an empty array
          setMessages([]);
          setStoreMessages([]);
        }
        
        // Now proceed with adding the feedback request message and calling the API
        const temperature = 0.7;
        
        if (displayPrompt) {
          // Check if feedback message already exists in the loaded messages
          const feedbackExists = loadedMessages.some(m => 
            m.role === 'user' && 
            m.content === displayPrompt // Check for exact content match, not just keywords
          );
          
          let messagesWithUserRequest = loadedMessages;
          
          if (!feedbackExists) {
            console.log('Adding new user feedback request message to UI');
            // Create a new user message with the SIMPLE feedback prompt for UI display
            const newUserMessage: Message = {
              id: crypto.randomUUID(),
                    conversationId: conversationId,
              role: 'user' as Role,
              content: displayPrompt, // Use simple prompt for display
              createdAt: new Date().toISOString(),
            };
            
            messagesWithUserRequest = [...loadedMessages, newUserMessage];
            
            // Update UI and store immediately
            setMessages(messagesWithUserRequest);
            setStoreMessages(messagesWithUserRequest);
            
            // Save conversation state
            saveConversationState(conversationId, messagesWithUserRequest);
          } else {
            console.log('Feedback request message already exists, not adding again.');
          }
          
          // Send the API request with the detailed prompt
          console.log('Sending detailed practice feedback directly to API...');
          try {
            const activeManagerType = practiceManagerType || managerType || 'PUPPETEER' as ManagerType;
            setLoading(true);
            
            console.log('Calling API with detailed practice feedback prompt');
            console.log("Feedback API Prompt Content:", apiPrompt);
            
            const response = await apiSendMessage(
              conversationId, 
              apiPrompt || '',
              activeManagerType,
              temperature,
              "post_feedback"
            ) as any;

            console.log('Raw Practice feedback API response object:', JSON.stringify(response, null, 2));
            console.log('Practice feedback API response received:', response);

            // Process the response
            if (response && response.messages && Array.isArray(response.messages) && response.messages.length > 1) {
              // Look for the assistant's message in the messages array
              const assistantMessage = response.messages.find(m => m.role === 'assistant');
              
              if (assistantMessage && assistantMessage.content) {
                // Found assistant message with content - use this instead of response.agentResponse
                const agentMessage: Message = {
                  id: assistantMessage.id || `assistant-${Date.now()}`,
                  role: 'assistant' as Role,
                  content: assistantMessage.content,
                conversationId: conversationId,
                  createdAt: assistantMessage.createdAt || new Date().toISOString()
              };
              
              console.log('Practice feedback agent message:', agentMessage);
              
              const baseMessages = messagesWithUserRequest.filter(m => !m.isLoading);
              console.log('Base messages count (including user request):', baseMessages.length);
              
              const hasAgentResponseAlready = baseMessages.some(m => m.id === agentMessage.id);
              let finalMessages;
                
              if (!hasAgentResponseAlready) {
                console.log('Appending new agent feedback response message');
                finalMessages = [...baseMessages, agentMessage];
              } else {
                console.log('Agent feedback response already exists, not appending duplicate');
                  finalMessages = baseMessages;
              }
              
              console.log('Setting final messages count:', finalMessages.length);
              setMessages(finalMessages);
              setStoreMessages(finalMessages);
              
              saveConversationState(conversationId, finalMessages);
              localStorage.setItem(`exact_messages_${conversationId}`, JSON.stringify(finalMessages));
              localStorage.setItem(`backup_messages_${conversationId}`, JSON.stringify(finalMessages));
              
              try {
                const updateEvent = new CustomEvent('messages-updated', {
                  detail: { conversationId: conversationId }
                });
                window.dispatchEvent(updateEvent);
                console.log('Dispatched messages-updated event');
              } catch (e) {
                console.error('Error dispatching message update event:', e);
              }
              
              // Clean up flags after successful response
              localStorage.removeItem('practice_to_chat');
              localStorage.removeItem('practice_feedback_prompt');
              localStorage.removeItem('practice_feedback_simple');
              localStorage.removeItem('feedbackRequest');
              localStorage.removeItem('currentPracticeInfo');
              localStorage.removeItem('force_conversation_id');
          localStorage.removeItem('practice_data');
            } else {
                // Messages exist but no assistant message with content found
                console.error('No assistant message with content found in the messages array:', response.messages);
                setError('Could not extract feedback content from response. Please try again.');
                
                // Clean up flags
              localStorage.removeItem('practice_to_chat');
              localStorage.removeItem('practice_feedback_prompt');
              localStorage.removeItem('practice_feedback_simple');
          localStorage.removeItem('feedbackRequest');
              localStorage.removeItem('force_conversation_id');
        }
            } else {
              // Invalid or incomplete response structure
              console.error('Invalid or incomplete practice feedback API response structure:', response);
              setError('Received an invalid response format. Please try again.');
              
              // Clean up flags
              localStorage.removeItem('practice_to_chat');
              localStorage.removeItem('practice_feedback_prompt');
              localStorage.removeItem('practice_feedback_simple');
              localStorage.removeItem('feedbackRequest');
              localStorage.removeItem('force_conversation_id');
            }
          } catch (apiError) {
            // Handle API call errors
            console.error('Error sending practice feedback to API:', apiError);
            setError('Failed to get feedback response. Please try again.');
            
            // Clean up flags on error
            localStorage.removeItem('practice_to_chat');
            localStorage.removeItem('practice_feedback_prompt');
            localStorage.removeItem('practice_feedback_simple');
            localStorage.removeItem('feedbackRequest');
            localStorage.removeItem('force_conversation_id');
      } finally {
            // Always reset loading state
        setLoading(false);
          }
          
          console.log('Practice feedback request processing finished for displayPrompt path');
        } else { // No display prompt
          console.error('No display prompt available, cannot process feedback request');
          
          // Clean up flags if there's no prompt to proceed
          localStorage.removeItem('practice_to_chat');
          localStorage.removeItem('practice_feedback_prompt');
          localStorage.removeItem('practice_feedback_simple');
          localStorage.removeItem('feedbackRequest');
          localStorage.removeItem('force_conversation_id');
        }
      } else { // practiceToChat !== 'true'
        console.log('practice_to_chat was not true. No feedback request processed.');
      }
    } catch (error) {
      // Handle any unexpected errors in the overall process
      console.error('Error in handlePracticeFeedbackRequest:', error);
      setError('An error occurred while processing feedback.');
      
      // Clean up flags on outer error
      localStorage.removeItem('practice_to_chat');
      localStorage.removeItem('practice_feedback_prompt');
      localStorage.removeItem('practice_feedback_simple');
      localStorage.removeItem('feedbackRequest');
      localStorage.removeItem('force_conversation_id');
    } finally {
      // Ensure the flag is always reset if it hasn't been already
      if (isProcessingFeedback.current) {
          isProcessingFeedback.current = false;
          console.log('Set isProcessingFeedback to false in outer finally block');
      }
    }
  };

  // Check for practice feedback on mount (only place where practice feedback should be handled)
  useEffect(() => {
    const handlePracticeFeedbackEvent = () => {
      console.log('🎯 Practice feedback event received, triggering feedback request handler');
      handlePracticeFeedbackRequest();
    };
    
    window.addEventListener('practice-feedback-request', handlePracticeFeedbackEvent);
    
    // Check for practice feedback request on component mount - single source of truth
    const practiceToChat = localStorage.getItem('practice_to_chat');
    if (practiceToChat === 'true' && !isProcessingFeedback.current) {
      console.log('Found practice_to_chat flag on mount, processing feedback request');
      // Set flag immediately to prevent duplicate processing
      isProcessingFeedback.current = true;
        handlePracticeFeedbackRequest();
    }
    
    return () => {
      window.removeEventListener('practice-feedback-request', handlePracticeFeedbackEvent);
    };
  }, []);

  // REMOVED: Removed the second useEffect that was causing duplicate practice feedback processing
  // All practice feedback should be handled in the mount useEffect above

  // Check for practice feedback request from localStorage
  useEffect(() => {
    // REMOVED: Large duplicate practice feedback processing logic
    // Practice feedback is now handled only in the mount useEffect above to prevent duplicates
    // This useEffect now only monitors dependencies without triggering practice feedback
    console.log('useEffect dependency update - practice feedback handled in mount useEffect only');
  }, [currentConversation?.conversationId, messages.length, storeMessages.length]);

  // REMOVED: Second duplicate useEffect for practice-feedback-request event listener
  // This was causing the duplication - only one event listener should exist

  // Add a listener for forced message loading
  useEffect(() => {
    const handleForceLoadMessages = (event: Event) => {
      const customEvent = event as CustomEvent;
      const conversationId = customEvent.detail?.conversationId;
      
      console.log('Force load messages event received for conversation:', conversationId);
      
      if (conversationId && currentConversation?.conversationId === conversationId) {
        console.log('Forcing message reload from all sources');
        
        // First try to load from localStorage with all possible key formats
        const recoveredMessages = loadConversationState(conversationId);
        if (recoveredMessages && recoveredMessages.length > 0) {
          console.log('Successfully loaded messages from localStorage');
          setMessages(recoveredMessages);
        } else {
          // If no messages in localStorage, fetch from API
          console.log('No messages found in localStorage, fetching from API');
          fetchMessages();
        }
      }
    };
    
    window.addEventListener('force-load-messages', handleForceLoadMessages);
    
    return () => {
      window.removeEventListener('force-load-messages', handleForceLoadMessages);
    };
  }, [currentConversation]);

  // Add a listener for the clear-messages event
  useEffect(() => {
    const handleClearMessages = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newConversationId = customEvent.detail?.conversationId;
      
      console.log('Clear messages event received for conversation:', newConversationId);
      
      // Clear both state objects
      setMessages([]);
      setStoreMessages([]);
      
      // Reset any error state
      setError(null);
      
      // If we have the new conversation ID from the event, update our state
      if (newConversationId && (!currentConversation || currentConversation.conversationId !== newConversationId)) {
        console.log('Setting up UI for new draft conversation');
      }
    };
    
    window.addEventListener('clear-messages', handleClearMessages);
    
    return () => {
      window.removeEventListener('clear-messages', handleClearMessages);
    };
  }, []);

  // Add a listener for conversation deletion events
  useEffect(() => {
    const handleConversationDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const deletedConversationId = customEvent.detail?.conversationId;
      
      console.log('Conversation deleted event received for:', deletedConversationId);
      
      // If this is the current conversation we're viewing, clear the messages
      if (currentConversation?.conversationId === deletedConversationId) {
        console.log('Clearing messages for deleted conversation');
        setMessages([]);
        setStoreMessages([]);
        // Remove the error message that was previously set
        // setError('This conversation has been deleted.');
      }
    };
    
    window.addEventListener('conversation-deleted', handleConversationDeleted);
    
    return () => {
      window.removeEventListener('conversation-deleted', handleConversationDeleted);
    };
  }, [currentConversation]);

  // Add new useEffect to keep track of current conversation ID in localStorage
  useEffect(() => {
    // Only update localStorage if we have a valid non-draft conversation
    if (currentConversation?.conversationId && !currentConversation.conversationId.startsWith('draft-')) {
      console.log('Setting current-conversation-id in localStorage:', currentConversation.conversationId);
      localStorage.setItem('current-conversation-id', currentConversation.conversationId);
      
      // DO NOT clean up originalConversationId automatically, as we need it for context recovery
      // Instead, only clear it if explicitly switching to a different conversation (not for same conversation updates)
      const originalConversationId = localStorage.getItem('originalConversationId');
      const lastKnownConversationId = localStorage.getItem('last-known-conversation-id');
      
      if (lastKnownConversationId && 
          lastKnownConversationId !== currentConversation.conversationId && 
          originalConversationId && 
          originalConversationId !== currentConversation.conversationId) {
        console.log('Switching conversations, cleaning up originalConversationId');
        localStorage.removeItem('originalConversationId');
      }
      
      // Always track last known conversation ID for comparison
      localStorage.setItem('last-known-conversation-id', currentConversation.conversationId);
    }
    
    // Return cleanup function to remove localStorage items when component unmounts
    return () => {
      // Only clean up if this is a non-draft conversation
      if (currentConversation?.conversationId && !currentConversation.conversationId.startsWith('draft-')) {
        localStorage.removeItem('current-conversation-id');
      }
    };
  }, [currentConversation?.conversationId]);

  // Add an additional useEffect to ensure message persistence
  useEffect(() => {
    // Skip recovery if feedback is being processed
    if (isProcessingFeedback.current) {
      console.log('Auto-recovery skipped: practice feedback is processing');
      return;
    }
    
    // This function will ensure messages don't disappear during transitions
    const ensureMessagesLoaded = () => {
      if (currentConversation?.conversationId && messages.length === 0) {
        console.log('Messages empty but conversation exists, attempting recovery');
        
        // Try to recover from localStorage first
        const storedMessages = loadConversationState(currentConversation.conversationId);
        if (storedMessages && storedMessages.length > 0) {
          console.log('Recovered messages from localStorage');
          setMessages(storedMessages);
          setStoreMessages(storedMessages);
        } else if (!currentConversation.conversationId.startsWith('draft-')) {
          // If not in localStorage and not a draft, try to fetch from API
          console.log('No stored messages found, fetching from API');
          fetchMessages();
        }
      }
    };
    
    // Run immediately
    ensureMessagesLoaded();
    
    // And set up an interval to run occasionally
    const intervalId = setInterval(ensureMessagesLoaded, 2000);
    
    return () => clearInterval(intervalId);
  }, [currentConversation?.conversationId, messages.length]);

  // Add a special effect to handle returning from practice mode
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Returning from practice check skipped: feedback is processing');
      return;
    }
    
    const handleReturnFromPractice = () => {
      const returningFromPractice = localStorage.getItem('returning_from_practice') === 'true';
      
      if (returningFromPractice && currentConversation?.conversationId) {
        console.log('Detected return from practice mode, reloading messages');
        
        // Try to load from localStorage first
        const storedMessages = loadConversationState(currentConversation.conversationId);
        if (storedMessages && storedMessages.length > 0) {
          console.log(`Loaded ${storedMessages.length} messages from localStorage after practice`);
          setMessages(storedMessages);
          setStoreMessages(storedMessages);
        } else if (!currentConversation.conversationId.startsWith('draft-')) {
          // If not in localStorage and not a draft, try API
          console.log('Fetching messages from API after practice');
          fetchMessages();
        }
        
        // Clear the flag
        localStorage.removeItem('returning_from_practice');
      }
    };
    
    // Run on mount and when currentConversation changes
    handleReturnFromPractice();
  }, [currentConversation?.conversationId]);

  // Add a special effect to check for pending practice feedback responses
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Pending response check skipped: feedback is processing');
      return;
    }
    
    const checkForPendingResponses = () => {
      // Check if we have any pending agent responses from practice feedback
      const pendingResponseStr = localStorage.getItem('last_practice_feedback_response');
      
      if (pendingResponseStr && currentConversation?.conversationId) {
        try {
          console.log('Found pending practice feedback response');
          const pendingResponse = JSON.parse(pendingResponseStr);
          
          // Make sure this response belongs to the current conversation
          if (pendingResponse.conversationId === currentConversation.conversationId) {
            console.log('Processing pending practice feedback response for current conversation');
            
            // Check if we already have a matching agent response
            const hasMatchingResponse = messages.some(msg => 
              msg.role === 'assistant' && 
              msg.id === pendingResponse.id
            );
            
            if (!hasMatchingResponse && pendingResponse.agentResponse) {
              console.log('Adding missing agent response to UI');
              
              // Create the agent message
              const agentMessage: Message = {
                id: pendingResponse.id || `assistant-${Date.now()}`,
                role: 'assistant' as Role,
                content: pendingResponse.agentResponse,
                conversationId: currentConversation.conversationId,
                createdAt: pendingResponse.createdAt || new Date().toISOString()
              };
              
              // Update messages without loading indicators
              const messagesWithoutLoading = messages.filter(m => !m.isLoading);
              
              // Add the agent message
              const updatedMessages = [...messagesWithoutLoading, agentMessage];
              setMessages(updatedMessages);
              setStoreMessages(updatedMessages);
              
              // Save to localStorage
              saveConversationState(currentConversation.conversationId, updatedMessages);
              
              // Clear the pending response
              localStorage.removeItem('last_practice_feedback_response');
            } else {
              // We already have this response or it's invalid - clear it
              localStorage.removeItem('last_practice_feedback_response');
            }
          }
        } catch (e) {
          console.error('Error processing pending response:', e);
          localStorage.removeItem('last_practice_feedback_response');
        }
      }
    };
    
    // Run immediately
    checkForPendingResponses();
    
    // And set up an interval to check periodically
    const intervalId = setInterval(checkForPendingResponses, 2000);
    
    return () => clearInterval(intervalId);
  }, [currentConversation?.conversationId, messages]);

  // Add a listener for message update events
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Messages updated listener skipped: feedback is processing');
      return;
    }
    
    const handleMessagesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const updatedConversationId = customEvent.detail?.conversationId;
      
      console.log('Messages updated event received for conversation:', updatedConversationId);
      
      if (updatedConversationId && currentConversation?.conversationId === updatedConversationId) {
        console.log('Messages updated for current conversation - reloading');
        
        // First try to load from localStorage with all possible key formats
        const recoveredMessages = loadConversationState(updatedConversationId);
        if (recoveredMessages && recoveredMessages.length > 0) {
          console.log('Successfully loaded updated messages from localStorage');
          setMessages(recoveredMessages);
          setStoreMessages(recoveredMessages);
        } else {
          // If no messages in localStorage, fetch from API
          console.log('No updated messages found in localStorage, fetching from API');
          fetchMessages();
        }
      }
    };
    
    window.addEventListener('messages-updated', handleMessagesUpdated);
    
    return () => {
      window.removeEventListener('messages-updated', handleMessagesUpdated);
    };
  }, [currentConversation]);

  // Add a final check for practice feedback after a delay
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Final feedback check skipped: feedback is processing');
      return;
    }
    
    // If we have a practice feedback request in the UI but no response, re-check after a delay
    const checkForMissingFeedbackResponse = () => {
      const hasFeedbackRequest = messages.some(m => 
        m.role === 'user' && 
        m.content.includes('practice scenario') && 
        m.content.includes('ethical decision-making score')
      );
      
      const hasFeedbackResponse = messages.some(m => 
        m.role === 'assistant' && 
        messages.findIndex(msg => 
          msg.role === 'user' && 
          msg.content.includes('practice scenario') && 
          msg.content.includes('ethical decision-making score')
        ) < messages.indexOf(m)
      );
      
      if (hasFeedbackRequest && !hasFeedbackResponse && currentConversation) {
        console.log('Found practice feedback request without response - attempting to recover');
        
        // Force load messages to ensure we have the latest state
        const forceLoadEvent = new CustomEvent('force-load-messages', {
          detail: { conversationId: currentConversation.conversationId }
        });
        window.dispatchEvent(forceLoadEvent);
      }
    };
    
    // Check after 3 seconds to allow time for the API to respond
    const timeoutId = setTimeout(checkForMissingFeedbackResponse, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [messages, currentConversation]);

  // Find and modify the handleOptionClick function
  const handleOptionClick = useCallback(async (optionText: string, event?: React.MouseEvent) => {
    // Prevent event propagation if event is provided
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('Option clicked:', optionText);
    
    // If already processing an option, don't allow another click
    if (isProcessingOption.current) {
      console.log('Already processing an option, ignoring this click');
      return;
    }
    
    // Set processing flag
    isProcessingOption.current = true;
    
    try {
    
    const lowerCaseOption = optionText.toLowerCase();

    // For "Practice again" or "Yes, practice" options
    if (lowerCaseOption.includes('yes, practice') || lowerCaseOption.includes('practice again')) {
      console.log('Triggering practice mode...');
      const recentUserMessage = storeMessages.slice().reverse().find(m => m.role === 'user');
      if (recentUserMessage && currentConversation) {
        localStorage.setItem('originalConversationId', currentConversation.conversationId);
        // Store original problem - find the first substantial user message in the conversation
        const originalProblem = storeMessages.find(m => m.role === 'user' && m.id?.startsWith('user-'))?.content;
        if (originalProblem) {
          localStorage.setItem('practice_original_problem', originalProblem);
        }
        localStorage.setItem('practice_user_query', recentUserMessage.content);
        const activeManagerType = currentConversation?.managerType || 'PUPPETEER';
        localStorage.setItem('practice_manager_type', activeManagerType);
        setActiveManagerType(activeManagerType);
        setPracticeMode(true);
      } else {
        console.error('Could not initiate practice: missing context.');
        setError('Could not start practice mode. Missing conversation context.');
      }
    } 
    // For "Practice responding to a positive/negative reply" options
    else if (lowerCaseOption.includes('practice responding to a')) {
      // Track scenario completion based on current conversation using database API
      if (currentConversation?.conversationId) {
        const currentScenario = determineCurrentScenario();
        if (currentScenario) {
          try {
            // Mark this scenario as completed in the database
            if (currentScenario === 'accessibility') {
              await markAccessibilityScenariosCompletedAPI();
              console.log('Accessibility scenario marked as completed in database');
            } else if (currentScenario === 'privacy') {
              await markPrivacyScenariosCompletedAPI();
              console.log('Privacy scenario marked as completed in database');
            }
            
                         // Refresh user data to get updated completion status
             await refreshUserData();
             
             // Trigger sidebar refresh to update UI and show post survey if both scenarios are complete
             setTimeout(() => {
               window.dispatchEvent(new CustomEvent('refresh-sidebar'));
             }, 500);
          } catch (error) {
            console.error('Failed to mark scenario as completed:', error);
            // Continue with the flow even if the API call fails
          }
        }
      }
      
      // Create a simplified user message
      const isPositive = lowerCaseOption.includes('positive');
      const replyType = isPositive ? 'positive' : 'negative';
      const userFriendlyMessage = `Yes, simulate a ${replyType} reply.`;
      
      // IMPROVEMENT: Store the conversation ID for later recovery
      if (currentConversation && currentConversation.conversationId) {
        console.log('Storing original conversation ID before simulation:', currentConversation.conversationId);
        localStorage.setItem('originalConversationId', currentConversation.conversationId);
      }
      
      // Create a user message with just the display text
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user' as Role,
        content: userFriendlyMessage,
        conversationId: currentConversation?.conversationId || '',
        createdAt: new Date().toISOString(),
        isLoading: false
      };
      
      // Add this message to the UI immediately
      // Use functional update to ensure we have the latest state before adding
      setStoreMessages(prev => {
          const updatedMessages = [...prev, userMessage];
          // Save to conversation state immediately to preserve user message
      if (currentConversation?.conversationId) {
        saveConversationState(currentConversation.conversationId, updatedMessages);
      }
          return updatedMessages;
      });
      
      // Set a loading message to show the user something is happening
      const loadingMessage: Message = {
        id: `assistant-loading-${Date.now()}`,
        role: 'assistant' as Role,
        content: 'Thinking about a simulated response...',
        conversationId: currentConversation?.conversationId || '',
        createdAt: new Date().toISOString(),
        isLoading: true
      };
      
      // Add a small delay before showing the loading indicator to ensure UI updates
      setTimeout(() => {
        setStoreMessages(prev => [...prev, loadingMessage]);
        setLoading(true); // Set global loading state to true
        
        // Wait a moment to simulate typing, then send the API request with the HIDDEN detailed prompt
        setTimeout(() => {
          // Create a more detailed prompt that includes clear instructions for formatting
          const detailedPrompt = `Please simulate a ${replyType} reply from my boss regarding the ethical email I sent. \\nStart your response with \\"Sure! Here's a simulated ${replyType} reply your boss might send:\\" \\nThen on a new line start with \\"Subject: Re: \\" followed by the email subject. \\nFormat the rest like a real email reply with greeting, body, and signature. \\nDo not include any practice instructions, buttons, or options like [Yes, practice] in your response.`;
          
          // Send this prompt directly to the API without displaying it in the UI
          if (currentConversation && currentConversation.conversationId) { // Ensure currentConversation and its ID exist
            // Use the API function directly to bypass UI message creation
            // Ensure conversationId is correctly passed in the payload
            console.log('Sending simulated reply with conversationId:', currentConversation.conversationId); // Added log
            api.post<AgentMessagesResponse>('/api/v1/conversation/message', {
              conversationId: currentConversation.conversationId, // Use the existing conversation ID
              userQuery: detailedPrompt,
              managerType: currentConversation.managerType || managerType,
              temperature: temperature || 0.7,
              includeHistory: true, // Add this to ensure context is preserved
              historyLimit: 20 // Request more history for better context
            })
            .then((response) => {
              // Add a slight delay before removing the loading message to ensure it's visible
              setTimeout(() => {
                // Remove the loading message
                setStoreMessages(prev => prev.filter(m => m.id !== loadingMessage.id));
                setLoading(false); // Set global loading state back to false
                
                // Create a properly typed assistant message from the response
                if (response.data && response.data.messages && response.data.messages.length > 0) {
                  // Get the last message from the response (should be the assistant's response)
                  const lastMessage = response.data.messages[response.data.messages.length - 1];
                  
                  // Create a well-formed assistant message
                  const assistantMessage: Message = {
                    id: lastMessage.id || `assistant-${Date.now()}`,
                    role: 'assistant' as Role,
                    content: lastMessage.content || '',
                    conversationId: currentConversation.conversationId, // Ensure this uses the existing ID
                    createdAt: lastMessage.createdAt || new Date().toISOString()
                  };
                  
                  // CRITICAL FIX: Make sure we preserve the current conversation in state after simulation
                  // This ensures that any follow-up messages will use the same conversation
                  if (currentConversation && currentConversation.conversationId) {
                    // Re-apply the existing conversation to the store to ensure it's active
                    setCurrentConversation({
                      ...currentConversation,
                      isPersisted: true // Ensure this is marked as persisted
                    });
                  
                    // Also update the original conversation ID in localStorage for recovery
                    localStorage.setItem('originalConversationId', currentConversation.conversationId);
                    console.log('Updated originalConversationId in localStorage after simulation:', currentConversation.conversationId);
                  }

                  // Only add the AI response to the UI, not the prompt
                  // Use functional update to ensure latest state
                  setStoreMessages(prevMessages => {
                      const updatedMessages = [...prevMessages, assistantMessage];
                       // Save updated conversation state
                      saveConversationState(currentConversation.conversationId, updatedMessages);
                      return updatedMessages;
                  });

    } else {
                  // If we couldn't get a proper response, show an error
                  const errorMessage: Message = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant' as Role,
                    content: 'Sorry, I was unable to generate a response. Please try again.',
                    conversationId: currentConversation.conversationId, // Ensure this uses the existing ID
                    createdAt: new Date().toISOString()
                  };
                  
                  setStoreMessages(prevMessages => [...prevMessages, errorMessage]);
                }
              }, 600); // Ensure loading indicator is visible for at least 600ms
            })
            .catch(err => {
              setLoading(false);
              // Remove the loading message
              setStoreMessages(prev => prev.filter(m => m.id !== loadingMessage.id));
              
              console.error('Error getting rehearsal response:', err);
              setError('Failed to get rehearsal response');
              
              // Show an error message in the UI
              const errorMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant' as Role,
                content: 'Sorry, there was an error generating the response. Please try again.',
                conversationId: currentConversation.conversationId, // Ensure this uses the existing ID
                createdAt: new Date().toISOString()
              };
              
              setStoreMessages(prevMessages => [...prevMessages, errorMessage]);
            })
            .finally(() => { 
                // Processing flag will be reset in main finally block
            });
          } else {
            console.error('Cannot send simulated reply: No current conversation ID.');
            setError('Cannot send simulated reply. Please start a new chat.');
            setLoading(false);
          }
        }, 500);
      }, 100); // Small delay to ensure UI state is updated
      // isProcessingOption.current = false; // Removed from here to move into finally block
    }
    // For "Yes, help draft email" options - Enhanced Interactive Flow
    else if (lowerCaseOption.includes('yes, help draft') || lowerCaseOption.includes('draft email')) {
      console.log('Enhanced email assistant requested');
      
      // Find the most recent ethical issue/concern that the user raised
      const userMessages = storeMessages.filter(m => m.role === 'user');
      let originalEthicalIssue = '';
      
      // Strategy 1: Look for the most recent substantial user message that came after any practice feedback
      const lastFeedbackIndex = (() => {
        for (let i = storeMessages.length - 1; i >= 0; i--) {
          const msg = storeMessages[i];
          if (msg.role === 'assistant' && 
              (msg.content.includes('practice scenario') || 
               msg.content.includes('Strengths') || 
               msg.content.includes('Areas for Improvement'))) {
            return i;
          }
        }
        return -1;
      })();
      
      if (lastFeedbackIndex !== -1) {
        // Find user messages that came after the last practice feedback
        const messagesAfterFeedback = storeMessages.slice(lastFeedbackIndex + 1);
        const userMessagesAfterFeedback = messagesAfterFeedback.filter(m => m.role === 'user');
        
        // Look for the most recent substantial user message after feedback
        for (let i = userMessagesAfterFeedback.length - 1; i >= 0; i--) {
          const msg = userMessagesAfterFeedback[i];
          if (!msg.content.toLowerCase().includes('practice') && 
              !msg.content.toLowerCase().includes('draft') &&
              !msg.content.toLowerCase().includes('simulate') &&
              !msg.content.toLowerCase().includes('yes, help') &&
              !msg.content.toLowerCase().includes('copy') &&
              msg.content.length > 15) {
            originalEthicalIssue = msg.content;
            console.log('Found recent ethical issue after feedback:', originalEthicalIssue.substring(0, 50) + '...');
            break;
          }
        }
      }
      
      // Strategy 2: If no recent issue found after feedback, look for the most recent substantial user message overall
      if (!originalEthicalIssue && userMessages.length > 0) {
        for (let i = userMessages.length - 1; i >= 0; i--) {
          const msg = userMessages[i];
          if (!msg.content.toLowerCase().includes('practice') && 
              !msg.content.toLowerCase().includes('draft') &&
              !msg.content.toLowerCase().includes('simulate') &&
              !msg.content.toLowerCase().includes('yes, help') &&
              !msg.content.toLowerCase().includes('copy') &&
              msg.content.length > 15) {
            originalEthicalIssue = msg.content;
            console.log('Found most recent ethical issue:', originalEthicalIssue.substring(0, 50) + '...');
            break;
          }
        }
      }
      
      // Strategy 3: Final fallback - use the last user message if nothing else found
      if (!originalEthicalIssue && userMessages.length > 0) {
        originalEthicalIssue = userMessages[userMessages.length - 1].content;
        console.log('Using last user message as fallback:', originalEthicalIssue.substring(0, 50) + '...');
      }
      
      // Add user's request message
      const emailRequestMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user' as Role,
        content: optionText,
        conversationId: currentConversation?.conversationId || '',
        createdAt: new Date().toISOString()
      };
      
      setStoreMessages(prev => [...prev, emailRequestMessage]);
      
      // Start the enhanced email assistant flow
      setTimeout(() => {
        startEmailAssistant(originalEthicalIssue);
      }, 500);
    } 
    // For other options, keep the existing handling
    else {
      // Existing code for other options
      if (lowerCaseOption.includes('not now')) {
        console.log('User chose not to proceed for now.');
        
        // Create a user message to show in the chat
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          role: 'user' as Role,
          content: optionText,
          conversationId: currentConversation?.conversationId || '',
          createdAt: new Date().toISOString()
        };
        
        // Add the user message to the UI first
        setStoreMessages(prev => [...prev, userMessage]);
        
        // Save to localStorage if we have a valid conversation ID
        if (currentConversation?.conversationId) {
          saveConversationState(currentConversation.conversationId, [...storeMessages, userMessage]);
        }
        
        // Now send the message through the normal flow to get a contextual response
        // Use setTimeout to ensure the user message is rendered first
        setTimeout(() => {
          handleSendMessage(optionText, true); // Pass true to skip adding user message again
        }, 100);
      }
      else {
      handleSendMessage(optionText);
    }
    }
    } catch (error) {
      console.error('Error in handleOptionClick:', error);
      setError('An error occurred while processing your selection. Please try again.');
    } finally {
      // Always reset processing flag
      isProcessingOption.current = false;
    }
  }, [storeMessages, currentConversation, managerType, temperature, setStoreMessages, setActiveManagerType, setPracticeMode, setError, handleSendMessage]); // Added dependencies

  const handleCopyToClipboard = async (text: string, messageId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
        console.log('Email draft copied to clipboard');
        
      // Mark this email as copied
      if (messageId) {
        setCopiedEmails(prev => new Set(prev).add(messageId));
        
        // Reset the copy button after 1 second
        setTimeout(() => {
          setCopiedEmails(prev => {
            const newSet = new Set(prev);
            newSet.delete(messageId);
            return newSet;
          });
        }, 1000);
      }
      
      // Mark scenario as completed in database
      await markCurrentScenarioCompleted();
      
      // Add congratulations message from EVA
      const congratsMessage: Message = {
        id: `eva-congrats-${Date.now()}`,
          role: 'assistant' as Role,
        content: "🎉 **Congratulations!** You've successfully completed this scenario and drafted a professional email addressing the ethical issue.\n\nYour email has been copied to your clipboard and is ready to use. You've demonstrated excellent ethical reasoning and communication skills throughout this practice session.\n\nIf you'd like to continue using EVA for more ethical scenarios or general guidance, feel free to continue our conversation.",
          conversationId: currentConversation?.conversationId || '',
          createdAt: new Date().toISOString(),
        isScenarioCompletionMessage: true
      };
      
      setStoreMessages(prev => [...prev, congratsMessage]);
      
    } catch (err) {
        console.error('Failed to copy email draft: ', err);
        setError('Failed to copy draft to clipboard.');
    }
  };

  // Function to mark the current scenario as completed
  const markCurrentScenarioCompleted = async () => {
    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        console.error('No auth token available');
        return;
      }

      // Determine which scenario we're completing based on the conversation content
      const scenarioType = determineCurrentScenario();
      if (!scenarioType) {
        console.error('Could not determine current scenario type');
        return;
      }

      const endpoint = scenarioType === 'accessibility' 
        ? '/api/v1/user/mark-accessibility-scenarios-completed'
        : '/api/v1/user/mark-privacy-scenarios-completed';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log(`${scenarioType} scenario marked as completed`);
        // Refresh user data to update the store
        await refreshUserData();
      } else {
        console.error('Failed to mark scenario as completed:', response.statusText);
      }
    } catch (error) {
      console.error('Error marking scenario as completed:', error);
    }
  };

  // --- Modal Control Functions --- Define them here ---
  const handleCloseEditModal = useCallback(() => {
      setIsEditModalOpen(false);
      setDraftToEdit(null);
      setEditingMessageId(null);
  }, []); // No dependencies needed for resetting state

  const handleSaveEditedDraft = useCallback((editedContent: string) => {
      handleCloseEditModal(); // Close modal first
      console.log('Sending edited draft to agent...');
      
      // Remove the original draft message before sending the new one
      if (editingMessageId) {
          const messagesWithoutOriginalDraft = storeMessages.filter(m => m.id !== editingMessageId);
          setStoreMessages(messagesWithoutOriginalDraft);
          // No need to save state here, handleSendMessage will update and save
      }

      // Send the edited content as a new user message
      const submissionPrompt = `Here is the edited version of the draft email:\n\n${editedContent}`;
      handleSendMessage(submissionPrompt);
  }, [editingMessageId, storeMessages, setStoreMessages, handleSendMessage, handleCloseEditModal]);

  // --- Component-Level Edit/Discard Handlers --- Define them here ---
  const handleEditDraft = useCallback((messageId: string, draftContent: string) => {
      console.log('Edit draft requested for message:', messageId);
      setDraftToEdit(draftContent);
      setEditingMessageId(messageId);
      setIsEditModalOpen(true);
  }, []); // No dependencies needed for setting state
  
  const handleDiscardDraft = useCallback((messageId: string | undefined) => {
      if (!messageId) return;
      console.log('Discarding draft message:', messageId);
      const updatedMessages = storeMessages.filter(m => m.id !== messageId);
      setStoreMessages(updatedMessages);
      saveConversationState(currentConversation?.conversationId || '', updatedMessages);
  }, [storeMessages, setStoreMessages, currentConversation]); // Added dependencies

  // Add this function somewhere before the renderMessage function
  const formatMessageContent = (content: string): string => {
    if (!content) return '';
    
    // Ensure proper bullet point formatting
    let formatted = content;
    
    // Remove debug labels and redundant section headers
    formatted = formatted.replace(/^Introductory Paragraph:?\s*/i, '');
    formatted = formatted.replace(/^Detailed Feedback:?\s*/i, '');
    formatted = formatted.replace(/Detailed Feedback:\s*$/im, '');
    formatted = formatted.replace(/^"Detailed Feedback:"\s*/im, '');
    formatted = formatted.replace(/Detailed Feedback\s*$/im, '');
    formatted = formatted.replace(/\*+"?Detailed Feedback:?"?\s*/g, ''); // Remove *Detailed Feedback:
    formatted = formatted.replace(/"\*?Detailed Feedback:?\*?"\s*/g, ''); // Handle quoted version
    
    // First, clean up any existing HTML tags to avoid duplication
    formatted = formatted.replace(/<\/?strong>/g, '');
    formatted = formatted.replace(/<\/?em>/g, '');
    
    // Format markdown-style headings with double asterisks
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Clean up any remaining Markdown-style formatting
    formatted = formatted.replace(/\*([^*\s][^*]*[^*\s])\*/g, '<em>$1</em>');
    
    // Improved formatting for decision points
    formatted = formatted.replace(
      /(Decision \d+):\s*([^\n]+)/g, 
      '<strong>$1:</strong> $2'
    );
    
    // Format section headings
    formatted = formatted.replace(
      /^(Strengths|Areas for Improvement|Reasoning Process|Practical Advice for the Future|Detailed Feedback)(?:\s*:)?/gm,
      '<strong>$1:</strong>'
    );
    
    // Remove standalone asterisks and bullet points AFTER handling formatting
    formatted = formatted.replace(/^\s*\*\*\s*/gm, ''); // Remove ** at beginning of lines
    formatted = formatted.replace(/^\s*\*\s*$/gm, ''); // Remove isolated asterisks on their own lines
    formatted = formatted.replace(/^\s*•\s*$/gm, ''); // Remove isolated bullet points on their own lines
    formatted = formatted.replace(/\s\*\s/g, ' '); // Remove asterisks surrounded by spaces
    formatted = formatted.replace(/\*$/gm, ''); // Remove asterisks at end of lines

    // IMPORTANT: Preserve and convert bullet points
    // First mark all potential bullet points with a special marker to prevent interference with other regex
    formatted = formatted
      // Convert dash bullet points to the marker
      .replace(/^[ \t]*-[ \t]+(.+)$/gm, '••BULLET••$1')
      // Convert asterisk bullet points to the marker
      .replace(/^[ \t]*\*[ \t]+(.+)$/gm, '••BULLET••$1')
      // Convert standard bullet points to the marker
      .replace(/^[ \t]*•[ \t]+(.+)$/gm, '••BULLET••$1')
      // Also handle numbered lists
      .replace(/^[ \t]*(\d+)\.[ \t]+(.+)$/gm, '••NUMBER••$1••$2');
    
    // Now process bullet points into proper HTML lists
    let lines = formatted.split('\n');
    let inList = false;
    let inNumberedList = false;
    let processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line is a bullet point
      if (line.includes('••BULLET••')) {
        if (!inList) {
          // Start a new list
          processedLines.push('<ul>');
          inList = true;
        }
        
        // Close any open numbered list
        if (inNumberedList) {
          processedLines.push('</ol>');
          inNumberedList = false;
        }
        
        // Add as list item (extract content from the marker)
        const itemContent = line.replace('••BULLET••', '').trim();
        processedLines.push(`  <li>${itemContent}</li>`);
      } 
      // Check if this line is a numbered list item
      else if (line.includes('••NUMBER••')) {
        if (!inNumberedList) {
          // Start a new numbered list
          processedLines.push('<ol>');
          inNumberedList = true;
        }
        
        // Close any open bullet list
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        
        // Extract number and content
        const parts = line.split('••');
        const number = parts[1];
        const itemContent = parts[2] || '';
        processedLines.push(`  <li>${itemContent}</li>`);
      }
      else {
        // Not a list item - close any open lists
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (inNumberedList) {
          processedLines.push('</ol>');
          inNumberedList = false;
        }
        
        // Add the line as normal if it's not empty
        if (line.trim()) {
          processedLines.push(line);
        }
      }
    }
    
    // Close any open lists at the end
    if (inList) {
      processedLines.push('</ul>');
    }
    if (inNumberedList) {
      processedLines.push('</ol>');
    }
    
    // Join the processed lines back together
    formatted = processedLines.join('\n');
    
    // Now add paragraph tags for better spacing
    formatted = formatted.replace(/\n\n+/g, '</p><p>');
    
    // Make any scoring or metrics bold
    formatted = formatted.replace(/(\d+\/\d+|score of \d+)/gi, '<strong>$1</strong>');
    
    // Wrap in paragraph tags for proper spacing
    formatted = '<p>' + formatted + '</p>';
    
    // Fix any doubled paragraph tags
    formatted = formatted.replace(/<\/p><p><\/p><p>/g, '</p><p>');
    
    return formatted;
  };

  // --- Message Rendering Logic ---
  const renderMessage = useCallback((message: Message, index: number) => {
    const isUser = message.role === 'user';
    // Use let instead of const to allow reassignment
    let isAssistant = message.role === 'assistant';
    const isSystemMessage = message.role === 'system';
    const isLoading = message.isLoading === true;
    
    // Determine animation class based on message type
    const animationClass = isLoading 
      ? 'loading-animation' 
      : isUser 
        ? 'message-enter-user' 
        : 'message-enter-assistant';
    
    // Simplify detailed email draft requests for display
    if (isUser && message.content && typeof message.content === 'string') {
      const content = message.content;
      if (content.includes('professional email') && 
          content.includes('manager') && 
          content.includes('ethical concern') &&
          content.length > 100) {
        
        // This is the detailed prompt - replace it with simple version
        message = {
          ...message,
          content: "Please draft an email about this ethical concern."
        };
      }
    }
    
    // Use type safety - compare with string literals 
    let isPracticeAssistant = message.role === 'assistant' && message.content?.includes('practice-assistant');
    
    // For rendering purposes, treat practice-assistant same as assistant
    if (isPracticeAssistant) {
      isAssistant = true;
    }
    
    const currentMessageActiveSectionKey = activeMessageFeedbackSection[message.id || ''];
    
    // Initialize variables
    let displayContent = '';
    let rawContentForActions = message.content || 'No response content';
    let extractedOptions: string[] = [];
    let isEmailDraft = false;
    
    let isPracticeFeedback = false;
    
    // Variables for the new feedback structure
    let introductoryText = '';
    let overallSummaryTitle = ''; // e.g., "Summary of Feedback"
    let overallSummaryContent = '';
    let detailedFeedbackMainTitle = 'Detailed Feedback'; // Static or could be parsed
    let parsedDetailedFeedbackSections: { title: string; content: string; key: string; emoji?: string; originalHeading?: string; }[] = [];
    
    const optionRegex = /\[(.*?)\]/g; // Simplified regex for single brackets
    
    if (typeof message.content === 'string') {
      const rawContent = message.content || 'No response content';
      rawContentForActions = rawContent;
      displayContent = rawContent; // Default to raw content
      
      if (isAssistant) {
        const lowerContent = rawContent.toLowerCase();
        // More lenient check for practice feedback - look for key markers that indicate this is feedback
        const hasSummaryMarker = rawContent.includes("Summary of Feedback") || rawContent.includes("summary of feedback");
        const hasDetailedMarker = rawContent.includes("Detailed Feedback") || rawContent.includes("detailed feedback");
        const hasStrengthsMarker = rawContent.includes("Strengths") || rawContent.includes("strengths");
        const hasAreasMarker = rawContent.includes("Areas for Improvement") || rawContent.includes("areas for improvement");
        const hasReasoningMarker = rawContent.includes("Reasoning Process") || rawContent.includes("reasoning process");
        const hasAdviceMarker = rawContent.includes("Practical Advice") || rawContent.includes("practical advice");
        const hasScoreMarker = rawContent.includes("score of") || /\d+\/\d+/.test(rawContent);
        const hasActionPrompt = rawContent.includes("Do you feel ready") || rawContent.includes("Would you like to practice again");

        // More lenient detection that checks for multiple feedback indicators
        isPracticeFeedback = (hasStrengthsMarker && hasAreasMarker) || 
                            (hasDetailedMarker && (hasStrengthsMarker || hasAreasMarker)) ||
                            (hasSummaryMarker && (hasStrengthsMarker || hasAreasMarker || hasReasoningMarker)) ||
                            (hasScoreMarker && (hasStrengthsMarker || hasAreasMarker)) ||
                            (hasReasoningMarker && hasAdviceMarker) ||
                            (hasActionPrompt && (hasStrengthsMarker || hasAreasMarker));

        if (isPracticeFeedback) {
            console.log("[renderMessage] Detected practice feedback for message:", message.id);
            try {
                // Initialize section containers
                parsedDetailedFeedbackSections = [];
                
                // Define expected section headings with more variations for better matching
                const sectionDefinitions = [
                    { 
                        heading: "Strengths", 
                        alternateHeadings: ["Strengths:", "**Strengths**", "**Strengths:**", "* Strengths", "Strength"],
                        key: "strengths", 
                        emoji: "💪" 
                    },
                    { 
                        heading: "Areas for Improvement", 
                        alternateHeadings: ["Areas for Improvement:", "**Areas for Improvement**", "**Areas for Improvement:**", 
                                           "Weaknesses:", "**Weaknesses**", "* Areas for Improvement", "Improvement"],
                        key: "improvement", 
                        emoji: "📈" 
                    },
                    { 
                        heading: "Reasoning Process", 
                        alternateHeadings: ["Reasoning Process:", "**Reasoning Process**", "**Reasoning Process:**", 
                                           "Reasoning:", "**Reasoning**", "* Reasoning Process", "Your reasoning"],
                        key: "reasoning", 
                        emoji: "🧠" 
                    },
                    { 
                        heading: "Practical Advice for the Future", 
                        alternateHeadings: ["Practical Advice for the Future:", "**Practical Advice**", "**Practical Advice:**", 
                                           "Advice:", "**Advice**", "Future Steps:", "Practical Advice:", "* Practical Advice",
                                           "In similar situations"],
                        key: "advice", 
                        emoji: "🛠️" 
                    }
                ];
                
                const contentToParse = rawContent
                  .replace(/Detailed Feedback:?\s*$/im, '')
                  .replace(/^"Detailed Feedback:"\s*/im, '')
                  .replace(/^Detailed Feedback:?\s*/im, '')
                  .replace(/\*+"?Detailed Feedback:?"?\s*/g, '') // Remove *Detailed Feedback:
                  .replace(/"\*?Detailed Feedback:?\*?"\s*/g, '') // Handle quoted version
                  .replace(/^\s*\*\*\s*/gm, '') // Remove ** at beginning of lines
                  .replace(/^\s*\*\s*$/gm, '') // Remove standalone asterisks
                  .replace(/^\s*•\s*$/gm, ''); // Remove standalone bullet points
                
                // Identify introductory content - anything before the first section heading
                let introText = "";
                let restOfContent = contentToParse;
                
                // Find the first occurrence of any section heading
                const firstSectionIndex = Math.min(
                    ...sectionDefinitions.flatMap(def => 
                        [def.heading, ...def.alternateHeadings].map(heading => {
                            const idx = contentToParse.indexOf(heading);
                            return idx !== -1 ? idx : Infinity;
                        })
                    )
                );

                if (firstSectionIndex !== Infinity) {
                    introText = contentToParse.substring(0, firstSectionIndex).trim();
                    // Clean up any debug headers or stray asterisks in the intro text
                    introText = introText.replace(/^Introductory Paragraph:?\s*/i, '');
                    introText = introText.replace(/^\*+\s*/m, '');
                    introText = introText.replace(/\s\*\s/g, ' ');
                    restOfContent = contentToParse.substring(firstSectionIndex);
                    }
                   
                // Extract summary from intro if present
                let summaryText = "";
                const summaryStartMarker = "Summary of Feedback:";
                const summaryIndex = introText.indexOf(summaryStartMarker);
                
                    if (summaryIndex !== -1) {
                    // Extract everything from summary marker to end of intro
                    summaryText = introText.substring(summaryIndex + summaryStartMarker.length).trim();
                    // Update intro to exclude summary
                    introText = introText.substring(0, summaryIndex).trim();
                    } else {
                    // Try alternative markers
                    const altSummaryMarkers = ["Overall,", "In summary,", "To summarize,"];
                    for (const marker of altSummaryMarkers) {
                        const altIndex = introText.indexOf(marker);
                        if (altIndex !== -1) {
                            // Found an alternative summary marker
                            summaryText = introText.substring(altIndex).trim();
                            introText = introText.substring(0, altIndex).trim();
                            break;
                        }
                    }
                }
                
                // Set intro and summary content
                introductoryText = introText;
                overallSummaryTitle = "Summary of Feedback";
                overallSummaryContent = summaryText || "Your feedback highlights specific strengths and areas for improvement in your ethical decision-making.";
                
                // Process each section in the remaining content
                for (const sectionDef of sectionDefinitions) {
                    let sectionContent = "";
                    const allHeadings = [sectionDef.heading, ...sectionDef.alternateHeadings];
                            
                    // Try to find the section in the content
                    for (const heading of allHeadings) {
                        const sectionIndex = restOfContent.indexOf(heading);
                        if (sectionIndex !== -1) {
                            // Found the section heading
                            const sectionStart = sectionIndex + heading.length;
                            let sectionEnd = restOfContent.length;
                            
                            // Look for the next section heading
                            const otherHeadings = sectionDefinitions
                                .filter(def => def.key !== sectionDef.key)
                                .flatMap(def => [def.heading, ...def.alternateHeadings]);
                                
                            for (const nextHeading of otherHeadings) {
                                const nextIndex = restOfContent.indexOf(nextHeading, sectionStart);
                                if (nextIndex !== -1 && nextIndex < sectionEnd) {
                                    sectionEnd = nextIndex;
                                }
                            }
                            
                            // Also check for conclusion markers
                            const conclusionMarkers = [
                                "Concluding Action Prompt:", 
                                "Do you feel ready", 
                                "Would you like to practice again"
                            ];
                            
                            for (const marker of conclusionMarkers) {
                                const markerIndex = restOfContent.indexOf(marker, sectionStart);
                                if (markerIndex !== -1 && markerIndex < sectionEnd) {
                                    sectionEnd = markerIndex;
                                    }
                                }
                                
                            // Extract the section content
                            sectionContent = restOfContent.substring(sectionStart, sectionEnd).trim();

                            // Clean up the section content right when it's extracted
                            sectionContent = sectionContent
                              // Remove initial asterisks that often appear in the content
                              .replace(/^\*+\s*/m, '')
                              // Clean up any stray/standalone asterisks
                              .replace(/\s\*\s/g, ' ')
                              .replace(/^\*\s/gm, '')
                              .replace(/\*$/gm, '')
                              .trim();

                            break;
                        }
                    }
                    
                    // Add section with content or placeholder
                            parsedDetailedFeedbackSections.push({
                                title: `${sectionDef.emoji} ${sectionDef.heading}`,
                                originalHeading: sectionDef.heading,
                        // Just store the raw cleaned content - formatting will happen at render time
                        content: sectionContent || `No specific information available for ${sectionDef.heading}.`,
                                key: sectionDef.key,
                                emoji: sectionDef.emoji
                            });
                        }
                
                // Make sure we have all required sections
                if (parsedDetailedFeedbackSections.length === 0) {
                    // Fallback: create basic sections if none were found
                    sectionDefinitions.forEach(def => {
                             parsedDetailedFeedbackSections.push({
                            title: `${def.emoji} ${def.heading}`,
                            originalHeading: def.heading,
                            content: `Section content could not be extracted.`,
                            key: def.key,
                            emoji: def.emoji
                            });
                        });
                    }
                
                // Sort sections in the correct order
                     parsedDetailedFeedbackSections.sort((a, b) => 
                        sectionDefinitions.findIndex(s => s.key === a.key) - 
                        sectionDefinitions.findIndex(s => s.key === b.key)
                    );

                // Log successful parsing
                console.log("[renderMessage] Successfully parsed feedback with sections:", 
                    parsedDetailedFeedbackSections.map(s => s.key));
                
            } catch (parseError) {
                console.error("[renderMessage] Error parsing feedback content:", parseError);
                // On error, fallback to rendering as normal message but flag as feedback for button display
                displayContent = rawContent;
                
                // Create basic sections since parsing failed
                const basicSections = [
                    { heading: "Strengths", key: "strengths", emoji: "💪" },
                    { heading: "Areas for Improvement", key: "improvement", emoji: "📈" },
                    { heading: "Reasoning Process", key: "reasoning", emoji: "🧠" },
                    { heading: "Practical Advice", key: "advice", emoji: "🛠️" }
                ];
                
                // Still create sections for UI, with generic content
                parsedDetailedFeedbackSections = basicSections.map(section => ({
                    title: `${section.emoji} ${section.heading}`,
                    originalHeading: section.heading,
                    content: `Unable to extract detailed content for this section.`,
                    key: section.key,
                    emoji: section.emoji
                }));
            }
        } else { 
            // Not practice feedback, or failed initial detection
            const lowerContent = rawContent.toLowerCase();
            isEmailDraft = 
                (lowerContent.includes('subject:') && lowerContent.includes('dear')) ||
                lowerContent.includes('draft email:') ||
                lowerContent.includes('here\'s a draft') ||
                (displayContent.split('\n\n').length > 2 && lowerContent.includes('sincerely'));
            extractedOptions = []; 
            if (!isEmailDraft) {
                const matches = [...rawContent.matchAll(optionRegex)];
                if (matches.length > 0) {
                    extractedOptions = matches.map(match => match[1].trim());
                    displayContent = rawContent.replace(optionRegex, '').replace(/\s*$/, '').trim(); 
                }
            }
            
            // For email drafts, format the content with better styling 
            if (isEmailDraft) {
                try {
                    // Try to extract subject line
                    const subjectMatch = rawContent.match(/Subject:([^\n]*)/i);
                    const subjectLine = subjectMatch ? subjectMatch[1].trim() : "Draft Email";
                    
                    // Format the display content with better styling
                    displayContent = rawContent;
                } catch (e) {
                    console.error("Error formatting email draft:", e);
                    displayContent = rawContent; // Fallback to original content
                 }
            }
        }
      }
    } else {
      displayContent = String(message.content || 'No response content');
      rawContentForActions = displayContent; 
    }
    
    // Check if this message contains a simulated reply
    const isSimulatedEmailReply = rawContentForActions.includes("simulated") && 
      (rawContentForActions.includes("reply your boss might send:") || 
       rawContentForActions.toLowerCase().includes("here's a simulated"));

    // Update the email draft condition
    isEmailDraft = isAssistant && (rawContentForActions.includes('Subject:') && (rawContentForActions.includes('Dear') || rawContentForActions.includes('[Your Name]')));
    
    const showDraftEmailPromptButtons = isAssistant && isPracticeFeedback && !isSimulatedEmailReply;
    // Only show email draft action buttons for regular drafts, not simulated replies
    const showEmailDraftActionButtons = isAssistant && isEmailDraft && !isSimulatedEmailReply;

    const showGenericOptionButtons = isAssistant && !isPracticeFeedback && !isEmailDraft && !isSimulatedEmailReply && extractedOptions.length > 0;
    
    // Email Assistant specific conditions
    const isEmailAssistantMessage = message.isEmailAssistant === true;
    const isEmailQuestionMessage = isEmailAssistantMessage && typeof message.emailQuestionIndex === 'number';
    const isEmailSummaryMessage = message.isEmailSummary === true;
    const isEmailFollowUpMessage = message.isFollowUp === true;

    const markdownComponents: ReactMarkdownOptions['components'] = {
        code({ node, inline, className, children, ...props }: any) { 
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        },
    };
    
    return (
      <div key={message.id || index} className="mb-4">
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isUser && !isSystemMessage && (
            <div className="flex-shrink-0 mr-2">
              <img src={darkMode ? logoDark : logoLight} alt="EVA" className="w-6 h-6" />
            </div>
          )}
          <div 
            className={`${
              isUser 
                ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100' 
                : isSystemMessage 
                  ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 italic' 
                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            } rounded-lg p-3 text-sm ${
              isLoading ? 'min-w-[45px]' : isUser ? 'max-w-[70%]' : 'max-w-[75%]'
            } ${animationClass}`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            ) : isPracticeFeedback ? (
              // --- Feedback Display Structure ---
              <div className="practice-feedback-container">
                {/* Introductory Paragraph in a styled container */}
                {introductoryText && (
                  <div className={`prose prose-sm dark:prose-invert max-w-none mb-3 p-3 bg-gray-50/10 dark:bg-gray-800/30 rounded-md border border-gray-200/30 dark:border-gray-700/50 ${darkMode ? 'dark' : 'light'}`}>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatMessageContent(introductoryText)
                      }}
                      className="feedback-content introduction-text"
                    />
          </div>
            )}

                {/* Summary of Feedback section */}
                {overallSummaryTitle && (
                  <div className="mb-4">
                    <h3 className="font-medium text-base mb-2 text-gray-800 dark:text-gray-200 flex items-center">
                      <span className="mr-2 text-sm">📋</span>{overallSummaryTitle}
                    </h3>
                    <div className={`prose prose-sm dark:prose-invert max-w-none p-3 bg-blue-50/10 dark:bg-blue-900/10 border border-blue-100/30 dark:border-blue-800/30 rounded-md ${darkMode ? 'dark' : 'light'}`}>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formatMessageContent(overallSummaryContent)
                        }}
                        className="feedback-content summary-content"
                      />
        </div>
                  </div>
                )}

                {/* Detailed Feedback Section with Expandable Areas */}
                {parsedDetailedFeedbackSections.length > 0 && (
                  <div className="my-3">
                    <h3 className="font-medium text-base mb-2 text-gray-800 dark:text-gray-200 flex items-center">
                      <span className="mr-2 text-sm">🔍</span>{detailedFeedbackMainTitle}
                    </h3>

                    {/* Use the renderSections helper to display unique sections */}
                    {renderSections(parsedDetailedFeedbackSections, message.id, currentMessageActiveSectionKey)}
                      </div>
                    )}
                  </div>
              // --- End Feedback Display Structure ---

            ) : (
              // Regular message display (non-feedback)
              <div className={`message-content prose prose-sm dark:prose-invert max-w-none`}>
                <ReactMarkdown components={markdownComponents} remarkPlugins={[]}>{displayContent}</ReactMarkdown>
              </div>
            )}
          </div>
          {isUser && (
            <div className="flex-shrink-0 ml-2 bg-blue-500 text-white rounded-full h-6 w-6 flex items-center justify-center">
              <span className="text-xs">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'} 
              </span>
            </div>
          )}
        </div>
        
        {/* --- Buttons Area --- */}
        {/* Practice Feedback Action Buttons - Now moved outside the message */}
        {isPracticeFeedback && !isSimulatedEmailReply && (
          <div className="mt-1 ml-10 py-2">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Do you feel ready to discuss this with your manager, or would you like to practice again?
                  </p>
            <div className="flex flex-wrap gap-1.5">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={(e) => {
                        // Pass the event to prevent propagation
                        handleOptionClick("Yes, help draft email", e);
                      }} 
                      disabled={isDraftingEmail || loading}
                      className="text-xs h-auto py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                <span className="mr-1 text-xs">📝</span> Help draft email
                    </Button>
                  </div>
              </div>
            )}

        {showGenericOptionButtons && !isSimulatedEmailReply && (
          <div className="mt-2 flex flex-wrap gap-1.5 ml-7"> 
            {extractedOptions.map((option, idx) => (
                <Button key={idx} variant="outline" size="sm" onClick={() => handleOptionClick(option)} className="text-xs h-auto py-1.5 px-2.5">{option}</Button>
            ))}
          </div>
        )}
  
        {/* Conditional Rendering: ONLY show these if NOT practice feedback */}
        {!isPracticeFeedback && showDraftEmailPromptButtons && !isSimulatedEmailReply && (
          <div className="mt-3 flex flex-wrap gap-2 ml-7 items-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mr-2 mb-1 sm:mb-0">Would you like to take action now?</p>
            <Button variant="default" size="sm" onClick={() => handleOptionClick("Yes, create a draft email to my boss")} className="text-xs h-auto py-1.5 px-2.5 bg-green-600 hover:bg-green-700 transition-colors duration-200">
              <span className="mr-1">📝</span> Yes, create draft...
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleOptionClick("Not now")} className="text-xs h-auto py-1.5 px-2.5 transition-colors duration-200">
              <span className="mr-1">⏱️</span> Not now
            </Button>
            </div>
        )}

        {showEmailDraftActionButtons && (
          <div className="mt-3 ml-7">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(() => {
                const isEmailCopied = message.id && copiedEmails.has(message.id);
                return (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => !isEmailCopied && handleCopyToClipboard(rawContentForActions, message.id)}
                    disabled={isEmailCopied}
                    className={`text-xs h-auto py-1.5 px-2.5 transition-colors duration-200 ${
                      isEmailCopied 
                        ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <span className="mr-1">{isEmailCopied ? '✅' : '📋'}</span> 
                    {isEmailCopied ? 'Copied!' : 'Copy Email'}
              </Button>
                );
              })()}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">You can copy this draft to use it directly.</p>
          </div>
        )}

        {/* Email Assistant Question Buttons */}
        {isEmailQuestionMessage && !isEmailFollowUpMessage && (
          <div className="mt-3 ml-7">
            {(() => {
              const currentQ = emailQuestions[message.emailQuestionIndex!];
              const questionIndex = message.emailQuestionIndex!;
              const selectedChoice = selectedChoices[questionIndex];
              const isQuestionAnswered = selectedChoice !== undefined;
              
              if (currentQ?.type === 'text') {
                // Text input for the last question
                return (
                  <div className="mb-2">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder={currentQ.placeholder || "Type your response..."}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            handleEmailQuestionResponse(input.value.trim(), true);
                            input.value = '';
                          }
                        }}
                      />
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          handleEmailQuestionResponse(input.value.trim(), true);
                          input.value = '';
                        }}
                        className="text-xs h-auto py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Send
              </Button>
            </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      You can leave this empty if you have no specific preferences
                    </div>
                  </div>
                );
              } else {
                // Choice buttons
                return (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {currentQ?.choices?.map((choice, idx) => {
                      const isSelected = selectedChoice === choice;
                      return (
                        <Button 
                          key={idx} 
                          variant="outline" 
                          size="sm" 
                          onClick={() => !isQuestionAnswered && handleEmailQuestionResponse(choice)} 
                          disabled={isQuestionAnswered}
                          className={`text-xs h-auto py-2 px-3 transition-colors duration-200 ${
                            isSelected 
                              ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200'
                              : isQuestionAnswered 
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 cursor-pointer'
                          }`}
                        >
                          {choice}
                        </Button>
                      );
                    })}
                  </div>
                );
              }
            })()}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${((message.emailQuestionIndex! + 1) / emailQuestions.length) * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {message.emailQuestionIndex! + 1} of {emailQuestions.length}
              </span>
            </div>
          </div>
        )}



        {/* Email Assistant Summary and Generate Button */}
        {isEmailSummaryMessage && (
          <div className="mt-3 ml-7">
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => generateEmailWithData()}
                disabled={isDraftingEmail}
                className="text-xs h-auto py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <span className="mr-1">📧</span> Generate Email
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Reset all email assistant state
                  setEmailAssistantActive(false);
                  setCurrentEmailQuestion(0);
                  setEmailQuestionResponses([]);
                  setSelectedChoices({});
                  setEmailDraftData({
                    tone: '',
                    concern: '',
                    address: '',
                    references: [],
                    action: '',
                    originalEthicalIssue: emailDraftData.originalEthicalIssue
                  });
                  
                  // Remove all email assistant messages from chat
                  setStoreMessages(prev => prev.filter(msg => !msg.isEmailAssistant));
                  
                  // Restart the email assistant from the beginning
                  setTimeout(() => {
                    startEmailAssistant(emailDraftData.originalEthicalIssue);
                  }, 300);
                }}
                disabled={isDraftingEmail}
                className="text-xs h-auto py-2 px-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Start Over
              </Button>
            </div>
          </div>
        )}

        {/* Scenario Completion Button - Show after congratulations message */}
        {message.isScenarioCompletionMessage && (
          <div className="mt-3 ml-7">
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowScenarioModal(true)}
                className="text-xs h-auto py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <span className="mr-1">🎯</span> Continue to Other Scenarios
              </Button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
              Practice more scenarios to further develop your ethical decision-making skills
            </p>
          </div>
        )}
      </div>
    );
  }, [darkMode, user, handleOptionClick, handleCopyToClipboard, handleEditDraft, handleDiscardDraft, activeMessageFeedbackSection, toggleMessageSection]); // Removed expandedMessageSections and handleMessageAccordionValueChange, added activeMessageFeedbackSection and toggleMessageSection

  // Update the handlePracticeResponse function
  const handlePracticeResponse = (response: 'yes' | 'no') => {
    if (response === 'yes') {
      // Get the most recent user message and agent response
      const recentUserMessage = storeMessages.find(m => m.role === 'user');
      const recentAgentMessage = storeMessages.find(m => m.role === 'assistant');
      
      if (recentUserMessage && recentAgentMessage) {
        console.log('Setting up practice mode with:', recentUserMessage.content);
        
        // Save the current conversation ID as the original - this is crucial for returning to the same conversation
        if (currentConversation && currentConversation.conversationId) {
          console.log('Saving original conversation ID:', currentConversation.conversationId);
          localStorage.setItem('originalConversationId', currentConversation.conversationId);
        }
        
        // Store the query and response in localStorage for the practice module to use
        localStorage.setItem('practice_user_query', recentUserMessage.content);
        localStorage.setItem('practice_agent_response', recentAgentMessage.content);
        
        // Set active manager type based on conversation
        const activeManagerType = currentConversation?.managerType || 'PUPPETEER';
        localStorage.setItem('practice_manager_type', activeManagerType);
        setActiveManagerType(activeManagerType);
        
        // Enter practice mode
        setPracticeMode(true);
      } else {
        // Handle edge case - no prior messages found
        console.error('No recent messages found for practice mode');
        setError('Could not find conversation content for practice. Please try sending a message first.');
      }
    } else {
      // User chose not to practice - just hide the practice buttons by updating the message content
      // Instead of adding a new message, just update the current state to rerender without buttons
      // Force a rerender by making a shallow copy of the messages array
      setStoreMessages([...storeMessages]);
      
      // Trigger a sidebar refresh to update the conversation list
      triggerSidebarRefresh();
    }
  };

  // Add a handler for exiting practice mode
  const handleExitPracticeMode = () => {
    setPracticeMode(false);
    setActiveManagerType(undefined);
    
    // Set the flag that we're returning from practice
    localStorage.setItem('returning_from_practice', 'true');
    
    // Get the original conversation ID if it exists
    const originalConversationId = localStorage.getItem('originalConversationId');
    console.log('Exiting practice mode, original conversation ID:', originalConversationId);
    
    if (originalConversationId) {
      // Check if we already have this conversation
      if (currentConversation?.conversationId !== originalConversationId) {
        // Set the conversation to the original one
        setCurrentConversation({
          conversationId: originalConversationId,
          title: currentConversation?.title || 'Conversation',
          managerType: currentConversation?.managerType || getManagerType() as ManagerType,
          createdAt: currentConversation?.createdAt || new Date().toISOString()
        });
      }
    }
  };

  // Helper function to render feedback sections while avoiding duplicates
  const renderSections = (sections: any[], messageId: string | undefined, currentActiveSectionKey: string | null) => {
    // Create a map to track which section keys we've already seen
    const seenKeys = new Map();
    
    // Filter out duplicate sections based on key
    const uniqueSections = sections.filter(section => {
      if (seenKeys.has(section.key)) {
        return false;
      }
      seenKeys.set(section.key, true);
      return true;
    });

    return (
      <>
        {/* Buttons row */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {uniqueSections.map((section) => (
            <Button
              key={section.key}
              variant={currentActiveSectionKey === section.key ? "default" : "outline"}
              size="sm"
              onClick={() => messageId && toggleMessageSection(messageId, section.key)}
              className={`text-xs h-auto py-2 px-3 w-full text-left justify-start font-medium transition-all duration-200 
                ${currentActiveSectionKey === section.key 
                  ? 'bg-blue-500/80 dark:bg-blue-600/80 text-white dark:text-white border-blue-400 dark:border-blue-500' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 border-gray-300/50 dark:border-gray-700/50'}`}
            >
              <span className="mr-1.5 text-sm">{section.emoji}</span> {section.originalHeading || section.title}
            </Button>
          ))}
        </div>

        {/* Expanded content area */}
        {currentActiveSectionKey && (
          <div className="mt-2 mb-3 w-full border border-gray-200/50 dark:border-gray-700/50 rounded-md overflow-hidden bg-gray-50/10 dark:bg-gray-800/20 col-span-2 animate-fadeIn">
            <div className="p-3">
              <h4 className="font-medium text-sm mb-2 text-gray-800 dark:text-gray-200 flex items-center">
                <span className="mr-1.5 text-base">{uniqueSections.find(s => s.key === currentActiveSectionKey)?.emoji}</span> 
                <span>{uniqueSections.find(s => s.key === currentActiveSectionKey)?.originalHeading}</span>
              </h4>
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                <div 
                  dangerouslySetInnerHTML={{
                    __html: formatMessageContent(uniqueSections.find(s => s.key === currentActiveSectionKey)?.content || '')
                  }}
                  className={`feedback-content ${darkMode ? 'dark' : 'light'}`}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Show scenario selection modal when a new conversation is created
  useEffect(() => {
    // Show the modal when we have a new conversation or a draft conversation with no messages
    if (
      currentConversation && 
      ((currentConversation.isNew === true) || 
       (currentConversation.conversationId?.startsWith('draft-') && storeMessages.length === 0))
    ) {
      // Wait a moment to ensure everything is initialized
      setTimeout(() => {
        setShowScenarioModal(true);
      }, 300);
    }
  }, [currentConversation, storeMessages.length]);



  // Render practice module or chat interface based on practice mode state
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {practiceMode && activeManagerType ? (
        <div className="flex-1 overflow-y-auto">
          <PracticeModule 
            onExit={handleExitPracticeMode}
            managerType={activeManagerType}
            userQuery={localStorage.getItem('practice_user_query') || undefined}
          />
        </div>
      ) : (
        <>
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 w-full custom-scrollbar"
            ref={messagesContainerRef}
          >
            <div className="w-full max-w-5xl mx-auto pt-6 pb-4">
              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 flex items-center justify-between">
                  <div>{error}</div>
                  <div className="flex items-center">
                    {/* @ts-ignore - we know this exists when needed */}
                    {window.retryButton && window.retryButton}
                  {!currentConversation?.conversationId.startsWith('draft-') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={fetchMessages}
                      className="ml-2 text-xs h-auto py-1.5 px-2.5"
                    >
                      Refresh
                    </Button>
                  )}
                  </div>
                </div>
              )}
              {storeMessages.map((message, index) => renderMessage(message, index))}
              
              {loading && !storeMessages.some(msg => msg.isLoading) && (
                <div className="flex justify-start mb-4">
                  <div className="flex-shrink-0 mr-2">
                    <img src={darkMode ? logoDark : logoLight} alt="EVA" className="w-6 h-6" />
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-auto">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="h-4"></div>
              <div ref={messagesEndRef} className="pt-2"></div>
            </div>
          </div>
          
          <ChatInput 
            onSendMessage={handleSendMessage}
            isLoading={loading}
            disabled={loading}
            showKnowledgePanel={showKnowledgePanel}
          />
        </>
      )}

      <EditDraftModal 
        isOpen={isEditModalOpen}
        initialContent={draftToEdit}
        onSave={handleSaveEditedDraft}
        onClose={handleCloseEditModal}
      />

      {/* Add our Scenario Selection Modal */}
      <ScenarioSelectionModal
        isOpen={showScenarioModal}
        onClose={() => setShowScenarioModal(false)}
        onSelectScenario={(scenario) => {
          // Close the modal first
          setShowScenarioModal(false);
          
          // Determine prompt based on selected scenario with detailed context
          const prompt = scenario === 'privacy' 
            ? "My manager is pressuring me to collect unnecessary user location data for analytics purposes. What should I do?"
            : "My team is facing pressure to skip screen reader compatibility testing to meet a tight deadline. What should I do?";
          
          // Simply call handleSendMessage - this function already handles adding the user message
          // and sending it to the backend. Keeping it simple to avoid race conditions.
          setTimeout(() => {
            handleSendMessage(prompt);
          }, 100); // Small delay to ensure modal is closed first
        }}
      />

      {/* Add Simplified Tactics Modal */}
      <SimplifiedTacticsModal
        isOpen={showTacticsModal}
        onClose={() => setShowTacticsModal(false)}
      />

      {/* Scenario Transition Overlay - REMOVED: No longer using automatic popup */}
      {/* {showScenarioTransition && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md mx-4 text-center border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Scenario Completed!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You're being transferred to select your next practice scenario...
              </p>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};