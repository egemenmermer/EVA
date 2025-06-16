import { backendApi } from '../services/axiosConfig';
import { Message } from '../store/useStore';

/**
 * Comprehensive message recovery utility
 * Attempts to recover messages from any available localStorage key
 * and ensures they're saved to database
 */
export class MessageRecovery {
  
  /**
   * Get all possible localStorage keys for a conversation
   */
  private static getStorageKeys(conversationId: string): string[] {
    return [
      `exact_messages_${conversationId}`,
      `complete_messages_${conversationId}`,
      `all_messages_${conversationId}`,
      `practice_messages_${conversationId}`,
      `email_messages_${conversationId}`,
      `feedback_messages_${conversationId}`,
      `messages_${conversationId}`,
      `messages-${conversationId}`,
      `backup_messages_${conversationId}`,
    ];
  }

  /**
   * Get all timestamped backup keys for a conversation
   */
  private static getTimestampedKeys(conversationId: string): string[] {
    const allKeys = Object.keys(localStorage);
    return allKeys
      .filter(key => 
        key.startsWith(`messages_${conversationId}_`) && 
        key.includes('-') // Contains timestamp format
      )
      .sort()
      .reverse(); // Most recent first
  }

  /**
   * Attempt to recover messages from localStorage
   */
  static recoverMessages(conversationId: string): Message[] | null {
    if (!conversationId || conversationId.startsWith('draft-')) {
      return null;
    }

    console.log(`🔄 Attempting message recovery for conversation: ${conversationId}`);

    try {
      // Try standard keys first
      const standardKeys = this.getStorageKeys(conversationId);
      for (const key of standardKeys) {
        const savedState = localStorage.getItem(key);
        if (savedState) {
          try {
            const messages = JSON.parse(savedState);
            if (Array.isArray(messages) && messages.length > 0) {
              console.log(`✅ Recovered ${messages.length} messages from key: ${key}`);
              return messages;
            }
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse messages from key ${key}:`, parseError);
          }
        }
      }

      // Try timestamped backups
      const timestampedKeys = this.getTimestampedKeys(conversationId);
      for (const key of timestampedKeys) {
        const savedState = localStorage.getItem(key);
        if (savedState) {
          try {
            const messages = JSON.parse(savedState);
            if (Array.isArray(messages) && messages.length > 0) {
              console.log(`✅ Recovered ${messages.length} messages from timestamped backup: ${key}`);
              return messages;
            }
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse messages from timestamped key ${key}:`, parseError);
          }
        }
      }

      console.log(`❌ No recoverable messages found for conversation: ${conversationId}`);
      return null;

    } catch (error) {
      console.error('❌ Error during message recovery:', error);
      return null;
    }
  }

  /**
   * Save messages to database if they're not already there
   */
  static async ensureMessagesInDatabase(conversationId: string, messages: Message[]): Promise<void> {
    if (!conversationId || conversationId.startsWith('draft-') || !messages.length) {
      return;
    }

    console.log(`💾 Ensuring ${messages.length} messages are saved to database for conversation: ${conversationId}`);

    try {
      // Get existing messages from database
      const existingResponse = await backendApi.get(`/api/v1/conversation/message/${conversationId}`);
      const existingMessages = Array.isArray(existingResponse.data) ? existingResponse.data : [];
      const existingIds = new Set(existingMessages.map((m: any) => m.id));

      // Save any messages that don't exist in database
      const savePromises = messages
        .filter(message => !message.isLoading && !existingIds.has(message.id))
        .map(async (message) => {
          try {
            await backendApi.post('/api/v1/conversation/message/save', {
              conversationId: message.conversationId,
              messageId: message.id,
              content: message.content,
              role: message.role,
              createdAt: message.createdAt
            });
            console.log(`✅ Saved message ${message.id} to database`);
          } catch (error) {
            console.error(`❌ Failed to save message ${message.id} to database:`, error);
          }
        });

      await Promise.all(savePromises);
      console.log(`✅ Database sync completed for conversation: ${conversationId}`);

    } catch (error) {
      console.error('❌ Error ensuring messages in database:', error);
    }
  }

  /**
   * Comprehensive save to multiple localStorage keys
   */
  static saveToLocalStorage(conversationId: string, messages: Message[]): void {
    if (!conversationId || conversationId.startsWith('draft-') || !messages.length) {
      return;
    }

    try {
      const cleanMessages = messages.filter(m => !m.isLoading);
      const messageData = JSON.stringify(cleanMessages);
      
      // Save to all possible keys for maximum redundancy
      const keys = [
        `messages_${conversationId}`,
        `messages-${conversationId}`,
        `backup_messages_${conversationId}`,
        `exact_messages_${conversationId}`,
        `practice_messages_${conversationId}`,
        `email_messages_${conversationId}`,
        `feedback_messages_${conversationId}`,
        `complete_messages_${conversationId}`,
        `all_messages_${conversationId}`,
      ];

      keys.forEach(key => {
        localStorage.setItem(key, messageData);
      });

      // Also save with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      localStorage.setItem(`messages_${conversationId}_${timestamp}`, messageData);

      console.log(`💾 Saved ${cleanMessages.length} messages to ${keys.length + 1} localStorage keys`);

    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  /**
   * Full recovery and sync process
   */
  static async recoverAndSync(conversationId: string): Promise<Message[] | null> {
    if (!conversationId || conversationId.startsWith('draft-')) {
      return null;
    }

    console.log(`🔄 Starting full recovery and sync for conversation: ${conversationId}`);

    // Step 1: Try to recover from localStorage
    const recoveredMessages = this.recoverMessages(conversationId);
    
    if (recoveredMessages && recoveredMessages.length > 0) {
      // Step 2: Ensure messages are in database
      await this.ensureMessagesInDatabase(conversationId, recoveredMessages);
      
      // Step 3: Re-save to localStorage for redundancy
      this.saveToLocalStorage(conversationId, recoveredMessages);
      
      console.log(`✅ Recovery and sync completed for conversation: ${conversationId}`);
      return recoveredMessages;
    }

    console.log(`❌ No messages to recover for conversation: ${conversationId}`);
    return null;
  }

  /**
   * Clean up old timestamped backups (keep only last 10)
   */
  static cleanupOldBackups(conversationId: string): void {
    try {
      const timestampedKeys = this.getTimestampedKeys(conversationId);
      
      // Keep only the 10 most recent backups
      const keysToDelete = timestampedKeys.slice(10);
      
      keysToDelete.forEach(key => {
        localStorage.removeItem(key);
      });

      if (keysToDelete.length > 0) {
        console.log(`🧹 Cleaned up ${keysToDelete.length} old backup keys for conversation: ${conversationId}`);
      }

    } catch (error) {
      console.error('❌ Error cleaning up old backups:', error);
    }
  }
} 