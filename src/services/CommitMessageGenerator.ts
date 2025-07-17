import { 
  CommitMessageGenerator, 
  GenerationOptions, 
  CommitMessage, 
  ChangeAnalysis
} from '../interfaces/CommitMessageGenerator';
import { GitDiff } from '../interfaces/GitService';
import { UserPreferences } from '../interfaces/Configuration';
import { GitService } from '../interfaces/GitService';
import { AIService, ChangeContext } from '../interfaces/AIService';
import { ChangeAnalysisService } from '../interfaces/ChangeAnalysis';

/**
 * Error types for commit message generation
 */
export class CommitGenerationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'CommitGenerationError';
  }
}

export class NoStagedChangesError extends CommitGenerationError {
  constructor(message: string = 'No staged changes found for commit message generation') {
    super(message, 'NO_STAGED_CHANGES');
  }
}

export class InvalidRepositoryError extends CommitGenerationError {
  constructor(message: string = 'Not in a valid git repository') {
    super(message, 'INVALID_REPOSITORY');
  }
}

export class MessageValidationError extends CommitGenerationError {
  constructor(message: string = 'Generated commit message failed validation') {
    super(message, 'MESSAGE_VALIDATION_FAILED');
  }
}

/**
 * Core commit message generator that combines all services
 */
export class CommitMessageGeneratorImpl implements CommitMessageGenerator {
  private gitService: GitService;
  private aiService: AIService;
  private changeAnalysisService: ChangeAnalysisService;
  private userPreferences: UserPreferences;

  constructor(
    gitService: GitService,
    aiService: AIService,
    changeAnalysisService: ChangeAnalysisService,
    userPreferences: UserPreferences
  ) {
    this.gitService = gitService;
    this.aiService = aiService;
    this.changeAnalysisService = changeAnalysisService;
    this.userPreferences = userPreferences;
  }

  /**
   * Generate a commit message based on staged changes
   */
  async generateMessage(options: GenerationOptions): Promise<CommitMessage> {
    try {
      // Validate that we can generate a commit message
      await this.validateStagedChanges();

      // Get staged changes from git
      const diff = await this.gitService.getStagedChanges();
      
      // Analyze the changes to understand what was modified
      const analysis = this.analyzeChanges(diff);
      
      // Build context for AI generation
      const context = this.buildChangeContext(diff, analysis);
      
      // Generate the commit message using AI
      const generatedMessage = await this.generateWithAI(context, options, analysis);
      
      // Format and validate the final message
      const commitMessage = this.formatCommitMessage(generatedMessage, analysis, options);
      
      // Validate the generated message
      this.validateCommitMessage(commitMessage, options);
      
      return commitMessage;
    } catch (error) {
      if (error instanceof CommitGenerationError) {
        throw error;
      }
      
      throw new CommitGenerationError(
        `Failed to generate commit message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED'
      );
    }
  }

  /**
   * Validate that there are staged changes to commit
   */
  async validateStagedChanges(): Promise<boolean> {
    // Check if we're in a valid git repository
    const isValidRepo = await this.gitService.isValidRepository();
    if (!isValidRepo) {
      throw new InvalidRepositoryError();
    }

    // Check repository status
    const status = await this.gitService.getRepositoryStatus();
    if (!status.hasStagedChanges) {
      throw new NoStagedChangesError();
    }

    // Check for merge conflicts
    const conflictStatus = await this.gitService.getConflictStatus();
    if (conflictStatus.hasConflicts) {
      throw new CommitGenerationError(
        `Cannot generate commit message while merge conflicts exist in: ${conflictStatus.conflictedFiles.join(', ')}`,
        'MERGE_CONFLICTS_EXIST'
      );
    }

    return true;
  }

  /**
   * Analyze changes to determine commit type, scope, and impact
   */
  analyzeChanges(diff: GitDiff): ChangeAnalysis {
    return this.changeAnalysisService.analyzeChanges(diff);
  }

  /**
   * Build context for AI generation
   */
  private buildChangeContext(diff: GitDiff, analysis: ChangeAnalysis): ChangeContext {
    return {
      diff,
      preferences: this.userPreferences,
      projectContext: {
        name: this.extractProjectName(),
        type: this.detectProjectType(diff.files.map(f => f.path)),
        language: this.detectPrimaryLanguage(diff.files.map(f => f.path)),
        framework: this.detectFramework(diff.files.map(f => f.path))
      }
    };
  }

  /**
   * Generate commit message using AI service
   */
  private async generateWithAI(
    context: ChangeContext, 
    options: GenerationOptions, 
    analysis: ChangeAnalysis
  ): Promise<string> {
    // Build a comprehensive prompt for the AI
    const prompt = this.buildAIPrompt(context, options, analysis);
    
    // Generate the message using AI
    const generatedMessage = await this.aiService.generateCommitMessage(prompt, context);
    
    return generatedMessage;
  }

  /**
   * Build AI prompt for commit message generation
   */
  private buildAIPrompt(context: ChangeContext, options: GenerationOptions, analysis: ChangeAnalysis): string {
    let prompt = 'Generate a git commit message for the following changes:\n\n';
    
    // Add change summary
    prompt += `Change Analysis:\n`;
    prompt += `- Suggested type: ${analysis.commitType}\n`;
    prompt += `- Suggested scope: ${analysis.scope || 'none'}\n`;
    prompt += `- Impact level: ${analysis.impactLevel}\n`;
    prompt += `- File types: ${analysis.fileTypes.join(', ')}\n`;
    prompt += `- Description: ${analysis.description}\n\n`;
    
    // Add specific requirements based on options
    if (this.userPreferences.commitStyle === 'conventional') {
      prompt += 'Requirements:\n';
      prompt += '- Use conventional commit format: type(scope): description\n';
      
      if (options.commitType) {
        prompt += `- Use commit type: ${options.commitType}\n`;
      } else {
        prompt += `- Suggested commit type: ${analysis.commitType}\n`;
        prompt += `- Available types: ${this.userPreferences.customTypes.join(', ')}\n`;
      }
      
      if (options.includeScope && analysis.scope) {
        prompt += `- Include scope: ${analysis.scope}\n`;
      }
    }
    
    // Add length constraints
    prompt += `- Keep subject line under ${options.maxLength} characters\n`;
    prompt += '- Use imperative mood (e.g., "add", "fix", "update")\n';
    prompt += '- Be specific and descriptive\n';
    prompt += '- Focus on what and why, not how\n\n';
    
    // Add custom template if provided
    if (options.customTemplate) {
      prompt += `Custom template to follow: ${options.customTemplate}\n\n`;
    }
    
    return prompt;
  }

  /**
   * Format the generated message into a structured CommitMessage
   */
  private formatCommitMessage(
    generatedMessage: string, 
    analysis: ChangeAnalysis, 
    options: GenerationOptions
  ): CommitMessage {
    const message = generatedMessage.trim();
    
    // Parse conventional commit format if applicable
    const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);
    
    if (conventionalMatch && this.userPreferences.commitStyle === 'conventional') {
      const [, type, scope, description] = conventionalMatch;
      
      return {
        subject: message,
        type,
        scope: scope || undefined,
        body: this.userPreferences.includeBody ? this.generateBody(analysis) : undefined,
        isConventional: true
      };
    }
    
    // Fallback to non-conventional format
    return {
      subject: message,
      type: analysis.commitType,
      scope: analysis.scope,
      body: this.userPreferences.includeBody ? this.generateBody(analysis) : undefined,
      isConventional: false
    };
  }

  /**
   * Generate commit message body if requested
   */
  private generateBody(analysis: ChangeAnalysis): string | undefined {
    if (!this.userPreferences.includeBody) {
      return undefined;
    }
    
    const bodyParts: string[] = [];
    
    // Add impact information
    if (analysis.impactLevel !== 'minor') {
      bodyParts.push(`Impact: ${analysis.impactLevel}`);
    }
    
    // Add file type information
    if (analysis.fileTypes.length > 1) {
      bodyParts.push(`Affects: ${analysis.fileTypes.join(', ')} files`);
    }
    
    return bodyParts.length > 0 ? bodyParts.join('\n') : undefined;
  }

  /**
   * Validate the generated commit message
   */
  private validateCommitMessage(message: CommitMessage, options: GenerationOptions): void {
    // Check subject line length
    if (message.subject.length > options.maxLength) {
      throw new MessageValidationError(
        `Commit subject line too long: ${message.subject.length} > ${options.maxLength} characters`
      );
    }
    
    // Check that subject is not empty
    if (!message.subject.trim()) {
      throw new MessageValidationError('Commit subject line cannot be empty');
    }
    
    // Validate conventional commit format if required
    if (this.userPreferences.commitStyle === 'conventional' && message.isConventional) {
      this.validateConventionalFormat(message);
    }
  }

  /**
   * Validate conventional commit format
   */
  private validateConventionalFormat(message: CommitMessage): void {
    // Check that type is valid
    const validTypes = this.userPreferences.customTypes.map(t => t.toString());
    if (!validTypes.includes(message.type)) {
      throw new MessageValidationError(
        `Invalid commit type "${message.type}". Valid types: ${validTypes.join(', ')}`
      );
    }
    
    // Check conventional format pattern
    const conventionalPattern = /^(\w+)(?:\([^)]+\))?: .+$/;
    if (!conventionalPattern.test(message.subject)) {
      throw new MessageValidationError(
        'Commit message does not follow conventional format: type(scope): description'
      );
    }
  }

  /**
   * Extract project name from current directory or git config
   */
  private extractProjectName(): string {
    // In a real implementation, this would extract from package.json, git config, or directory name
    // For now, return a placeholder
    return 'project';
  }

  /**
   * Detect project type based on file patterns
   */
  private detectProjectType(filePaths: string[]): string {
    if (filePaths.some(path => path.includes('package.json'))) return 'nodejs';
    if (filePaths.some(path => path.includes('pom.xml'))) return 'java';
    if (filePaths.some(path => path.includes('requirements.txt') || path.includes('setup.py'))) return 'python';
    if (filePaths.some(path => path.includes('Cargo.toml'))) return 'rust';
    if (filePaths.some(path => path.includes('go.mod'))) return 'go';
    return 'generic';
  }

  /**
   * Detect primary programming language
   */
  private detectPrimaryLanguage(filePaths: string[]): string {
    const extensions = filePaths.map(path => {
      const ext = path.split('.').pop()?.toLowerCase();
      return ext || '';
    });
    
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'rs': 'rust',
      'go': 'go',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby'
    };
    
    // Count occurrences of each language
    const counts: Record<string, number> = {};
    extensions.forEach(ext => {
      const lang = languageMap[ext];
      if (lang) {
        counts[lang] = (counts[lang] || 0) + 1;
      }
    });
    
    // Return the most common language
    const mostCommon = Object.entries(counts).sort(([,a], [,b]) => b - a)[0];
    return mostCommon ? mostCommon[0] : 'unknown';
  }

  /**
   * Detect framework based on file patterns
   */
  private detectFramework(filePaths: string[]): string | undefined {
    if (filePaths.some(path => path.includes('angular.json'))) return 'angular';
    if (filePaths.some(path => path.includes('next.config'))) return 'nextjs';
    if (filePaths.some(path => path.includes('nuxt.config'))) return 'nuxtjs';
    if (filePaths.some(path => path.includes('vue.config'))) return 'vue';
    if (filePaths.some(path => path.includes('svelte.config'))) return 'svelte';
    if (filePaths.some(path => path.includes('gatsby-config'))) return 'gatsby';
    return undefined;
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: UserPreferences): void {
    this.userPreferences = preferences;
  }

  /**
   * Get current user preferences
   */
  getPreferences(): UserPreferences {
    return this.userPreferences;
  }
}