// Title generator utility using Google Gemini Pro

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API with the API key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;

try {
  if (!API_KEY) {
    console.warn('Warning: No Gemini API key found in environment variables. Title generation will use fallback method.');
  } else {
    genAI = new GoogleGenerativeAI(API_KEY);
    console.log('Gemini AI initialized successfully with API key');
  }
} catch (error) {
  console.error('Error initializing Gemini AI:', error);
}

/**
 * Generates a concise, descriptive title for a conversation based on the first message
 * 
 * @param userMessage The first message from the user
 * @returns A generated title for the conversation
 */
export const generateConversationTitle = async (userMessage: string): Promise<string> => {
  try {
    // Default title if API fails
    let defaultTitle = userMessage.length > 25 ? userMessage.substring(0, 25) + '...' : userMessage;
    
    console.log('Attempting to generate title for message:', userMessage.substring(0, 30) + '...');
    console.log('Using Gemini API Key:', API_KEY ? 'Available (starts with ' + API_KEY.substring(0, 5) + '...)' : 'Missing');
    
    // Don't call API for very short messages
    if (userMessage.length < 10) {
      console.log('Message too short, using default title');
      return defaultTitle;
    }
    
    if (!API_KEY || !genAI) {
      console.error('Gemini API not available. Check .env file for VITE_GEMINI_API_KEY');
      return defaultTitle;
    }
    
    // Configure the model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    // Create the prompt for generating a title
    const prompt = `Generate a short, concise title (2-6 words) for this conversation based on the user message below. The title should be descriptive and capture the essence of the query. Return ONLY the title text, no quotes or explanations.

User message: "${userMessage}"

Title:`;

    console.log('Sending prompt to Gemini Pro');
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const title = response.text().trim();
    
    console.log('Gemini generated title:', title);
    
    // Validate the title
    if (!title || title.length === 0) {
      console.warn('Gemini returned an empty title, using default');
      return defaultTitle;
    }
    
    // Return the generated title if valid, otherwise fallback to default
    return title || defaultTitle;
  } catch (error) {
    console.error('Error generating title with Gemini Pro:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Fallback to using the first part of the message
    return userMessage.length > 25 ? userMessage.substring(0, 25) + '...' : userMessage;
  }
}; 