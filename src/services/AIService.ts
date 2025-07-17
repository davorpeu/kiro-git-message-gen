import * as vscode from 'vscode';
import { AIService, AIModel, ChangeContext } from '../interfaces/AIService';
import { GitDiff } from '../interfaces/GitService';
import { CommitType } from '../interfaces/CommitMessageGenerator';

/**
 * Error types for AI service operations
 */
export class AIServiceError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class AIServiceUnavailableError extends AIServiceError {
  constructor(message: string = 'AI service is currently unavailable') {
    super(message, 'SERVICE_UNAVAILABLE');
  }
}

export class AIRateLimitError extends AIServiceError {
  constructor(message: string = 'AI service rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED');
  }
}

export class AIInvalidResponseError extends AIServiceError {
  constructor(message: string = 'AI service returned invalid response') {
    super(message, 'INVALID_RESPONSE');
  }
}

/**
 * Implementation of AIService that interfaces with Kiro's AI capabilities
 */
export class KiroAIService implements AIService {
  private static instance: KiroAIService;
  private currentModel: AIModel | null = null;
  private isInitialized = false;

  private constructor() {}

  /**
   * Get singleton instance of KiroAIService
   */
  public static getInstance(): KiroAIService {
    if (!KiroAIService.instance) {
      KiroAIService.instance = new KiroAIService();
    }
    return KiroAIService.instance;
  }

  /**
   * Initialize the AI service
   */
  public async initialize(): Promise<void> {
    try {
      // In a real Kiro extension, this would connect to Kiro's AI service
      // For now, we'll simulate the initialization
      this.currentModel = await this.detectCurrentModel();
      this.isInitialized = true;
    } catch (error) {
      throw new AIServiceUnavailableError(`Failed to initialize AI service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the currently selected AI model in Kiro
   */
  public async getCurrentModel(): Promise<AIModel> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.currentModel) {
      throw new AIServiceUnavailableError('No AI model is currently available');
    }

    return this.currentModel;
  }

  /**
   * Check if AI service is available
   */
  public async isAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return this.currentModel !== null && this.currentModel.isAvailable;
    } catch {
      return false;
    }
  }

  /**
   * Generate commit message using AI
   */
  public async generateCommitMessage(prompt: string, context: ChangeContext): Promise<string> {
    if (!await this.isAvailable()) {
      throw new AIServiceUnavailableError('AI service is not available');
    }

    try {
      // Build the complete prompt with context
      const fullPrompt = this.buildPrompt(prompt, context);
      
      // In a real Kiro extension, this would call Kiro's AI service
      // For now, we'll simulate the AI response
      const response = await this.callKiroAI(fullPrompt);
      
      // Validate and clean the response
      const cleanedResponse = this.validateAndCleanResponse(response, context);
      
      return cleanedResponse;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          throw new AIRateLimitError();
        }
        if (error.message.includes('unavailable') || error.message.includes('timeout')) {
          throw new AIServiceUnavailableError();
        }
      }
      
      throw new AIServiceError(`Failed to generate commit message: ${error instanceof Error ? error.message : 'Unknown error'}`, 'GENERATION_FAILED');
    }
  }

  /**
   * Build the complete prompt for AI generation
   */
  private buildPrompt(basePrompt: string, context: ChangeContext): string {
    const { diff, preferences } = context;
    
    let prompt = basePrompt || this.getDefaultPrompt();
    
    // Add diff information
    prompt += '\n\nGit diff summary:\n';
    prompt += `Files changed: ${diff.files.length}\n`;
    prompt += `Additions: ${diff.additions}, Deletions: ${diff.deletions}\n`;
    
    // Add file changes
    prompt += '\nChanged files:\n';
    diff.files.forEach(file => {
      prompt += `- ${file.path} (${file.status}): +${file.additions} -${file.deletions}\n`;
    });
    
    // Add preferences
    if (preferences.commitStyle === 'conventional') {
      prompt += '\nUse conventional commit format: type(scope): description\n';
      prompt += `Available types: ${preferences.customTypes.join(', ')}\n`;
    }
    
    if (preferences.analysisSettings.enableScopeInference) {
      prompt += 'Include appropriate scope based on changed files.\n';
    }
    
    // Add project context if available
    if (context.projectContext) {
      prompt += `\nProject context: ${context.projectContext.name} (${context.projectContext.language})\n`;
    }
    
    prompt += '\nGenerate a concise, descriptive commit message:';
    
    return prompt;
  }

  /**
   * Get default prompt for commit message generation
   */
  private getDefaultPrompt(): string {
    return `Generate a git commit message based on the following changes. 
The message should be clear, concise, and follow best practices.
Focus on what was changed and why, not how.`;
  }

  /**
   * Simulate calling Kiro's AI service
   * In a real implementation, this would use Kiro's actual AI API
   */
  private async callKiroAI(prompt: string): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Simulate potential errors
    const errorChance = Math.random();
    if (errorChance < 0.05) { // 5% chance of rate limit error
      throw new Error('rate limit exceeded');
    }
    if (errorChance < 0.1) { // 5% chance of service unavailable
      throw new Error('service unavailable');
    }
    
    // For demonstration, generate a simple response based on the prompt
    // In reality, this would be replaced with actual Kiro AI service calls
    return this.generateMockResponse(prompt);
  }

  /**
   * Generate a mock AI response for testing purposes
   * This would be replaced with actual Kiro AI service integration
   */
  private generateMockResponse(prompt: string): string {
    // Simple mock response generation based on prompt content
    if (prompt.includes('test') || prompt.includes('spec')) {
      return 'test: add unit tests for new functionality';
    }
    if (prompt.includes('fix') || prompt.includes('bug')) {
      return 'fix: resolve issue with data validation';
    }
    if (prompt.includes('doc') || prompt.includes('readme')) {
      return 'docs: update documentation and examples';
    }
    if (prompt.includes('refactor')) {
      return 'refactor: improve code structure and readability';
    }
    
    return 'feat: implement new feature based on requirements';
  }

  /**
   * Validate and clean AI response
   */
  private validateAndCleanResponse(response: string, context: ChangeContext): string {
    if (!response || typeof response !== 'string') {
      throw new AIInvalidResponseError('AI service returned empty or invalid response');
    }
    
    // Clean the response
    let cleaned = response.trim();
    
    // Remove any markdown code blocks but preserve the content inside
    cleaned = cleaned.replace(/```[\s\S]*?\n([\s\S]*?)\n```/g, '$1');
    cleaned = cleaned.replace(/```([\s\S]*?)```/g, '$1');
    
    // Remove inline code formatting
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Validate length - if too long, try to extract just the first line (commit subject)
    const maxLength = context.preferences.analysisSettings ? 144 : 100; // More reasonable max length
    if (cleaned.length > maxLength) {
      // If too long, try to extract just the commit message part
      const lines = cleaned.split('\n');
      cleaned = lines[0].trim();
      
      // If still too long, truncate but try to keep it meaningful
      if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength - 3) + '...';
      }
    }
    
    // Ensure it's not empty after cleaning
    if (!cleaned) {
      throw new AIInvalidResponseError('AI response was empty after cleaning');
    }
    
    return cleaned;
  }

  /**
   * Detect the current AI model available in Kiro
   * In a real implementation, this would query Kiro's AI service
   */
  private async detectCurrentModel(): Promise<AIModel> {
    // Simulate model detection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return a mock model for testing
    return {
      id: 'kiro-ai-v1',
      name: 'Kiro AI Assistant',
      provider: 'Kiro',
      isAvailable: true
    };
  }

  /**
   * Create a prompt specifically for commit message generation
   */
  public createCommitPrompt(diff: GitDiff, commitType?: CommitType, scope?: string): string {
    let prompt = 'Generate a git commit message for the following changes:\n\n';
    
    // Add file summary
    prompt += `Changed files (${diff.files.length}):\n`;
    diff.files.forEach(file => {
      prompt += `- ${file.path} (${file.status})\n`;
    });
    
    prompt += `\nTotal changes: +${diff.additions} -${diff.deletions}\n`;
    
    // Add specific instructions
    if (commitType) {
      prompt += `\nUse commit type: ${commitType}\n`;
    }
    
    if (scope) {
      prompt += `Use scope: ${scope}\n`;
    }
    
    prompt += '\nRequirements:\n';
    prompt += '- Use conventional commit format: type(scope): description\n';
    prompt += '- Keep the subject line under 50 characters\n';
    prompt += '- Use imperative mood (e.g., "add", "fix", "update")\n';
    prompt += '- Be specific and descriptive\n';
    prompt += '- Focus on what and why, not how\n';
    
    return prompt;
  }
}