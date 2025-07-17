import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  KiroAIService, 
  AIServiceError, 
  AIServiceUnavailableError, 
  AIRateLimitError, 
  AIInvalidResponseError 
} from '../AIService';
import { ChangeContext, AIModel } from '../../interfaces/AIService';
import { GitDiff } from '../../interfaces/GitService';
import { UserPreferences } from '../../interfaces/Configuration';
import { CommitType } from '../../interfaces/CommitMessageGenerator';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn()
  }
}));

describe('KiroAIService', () => {
  let aiService: KiroAIService;
  let mockDiff: GitDiff;
  let mockPreferences: UserPreferences;
  let mockContext: ChangeContext;

  beforeEach(() => {
    // Reset singleton instance for each test
    (KiroAIService as any).instance = undefined;
    aiService = KiroAIService.getInstance();

    // Setup mock data
    mockDiff = {
      files: [
        {
          path: 'src/components/Button.tsx',
          status: 'modified',
          additions: 5,
          deletions: 2,
          diff: '+ added new prop\n- removed old prop'
        },
        {
          path: 'src/components/__tests__/Button.test.tsx',
          status: 'added',
          additions: 20,
          deletions: 0,
          diff: '+ new test file'
        }
      ],
      additions: 25,
      deletions: 2,
      summary: 'Modified Button component and added tests'
    };

    mockPreferences = {
      commitStyle: 'conventional',
      includeBody: false,
      customTypes: [CommitType.FEAT, CommitType.FIX, CommitType.TEST],
      templates: {},
      analysisSettings: {
        enableFileTypeAnalysis: true,
        enableScopeInference: true,
        enableImpactAnalysis: true
      }
    };

    mockContext = {
      diff: mockDiff,
      preferences: mockPreferences,
      projectContext: {
        name: 'test-project',
        type: 'web',
        language: 'typescript'
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = KiroAIService.getInstance();
      const instance2 = KiroAIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(aiService.initialize()).resolves.not.toThrow();
    });

    it('should detect current model after initialization', async () => {
      await aiService.initialize();
      const model = await aiService.getCurrentModel();
      
      expect(model).toEqual({
        id: 'kiro-ai-v1',
        name: 'Kiro AI Assistant',
        provider: 'Kiro',
        isAvailable: true
      });
    });

    it('should auto-initialize when getting current model', async () => {
      const model = await aiService.getCurrentModel();
      expect(model.id).toBe('kiro-ai-v1');
    });
  });

  describe('Availability Check', () => {
    it('should return true when service is available', async () => {
      const isAvailable = await aiService.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should return false when initialization fails', async () => {
      // Mock initialization failure
      vi.spyOn(aiService as any, 'detectCurrentModel').mockRejectedValue(new Error('Network error'));
      
      const isAvailable = await aiService.isAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('Commit Message Generation', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should generate commit message successfully', async () => {
      const prompt = 'Generate a commit message';
      const result = await aiService.generateCommitMessage(prompt, mockContext);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use default prompt when none provided', async () => {
      const result = await aiService.generateCommitMessage('', mockContext);
      expect(result).toBeTruthy();
    });

    it('should include diff information in prompt', async () => {
      const buildPromptSpy = vi.spyOn(aiService as any, 'buildPrompt');
      
      await aiService.generateCommitMessage('test prompt', mockContext);
      
      expect(buildPromptSpy).toHaveBeenCalledWith('test prompt', mockContext);
    });

    it('should handle conventional commit preferences', async () => {
      mockContext.preferences.commitStyle = 'conventional';
      
      // Mock the callKiroAI to avoid random errors in this test
      vi.spyOn(aiService as any, 'callKiroAI').mockResolvedValue('feat: add new feature');
      
      const result = await aiService.generateCommitMessage('', mockContext);
      expect(result).toBeTruthy();
    });

    it('should include project context when available', async () => {
      const result = await aiService.generateCommitMessage('', mockContext);
      expect(result).toBeTruthy();
    });

    it('should work without project context', async () => {
      delete mockContext.projectContext;
      
      const result = await aiService.generateCommitMessage('', mockContext);
      expect(result).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should throw AIServiceUnavailableError when service is unavailable', async () => {
      // Mock service unavailable
      vi.spyOn(aiService, 'isAvailable').mockResolvedValue(false);
      
      await expect(
        aiService.generateCommitMessage('test', mockContext)
      ).rejects.toThrow(AIServiceUnavailableError);
    });

    it('should handle rate limit errors', async () => {
      // Mock rate limit error
      vi.spyOn(aiService as any, 'callKiroAI').mockRejectedValue(new Error('rate limit exceeded'));
      
      await expect(
        aiService.generateCommitMessage('test', mockContext)
      ).rejects.toThrow(AIRateLimitError);
    });

    it('should handle service unavailable errors', async () => {
      // Mock service unavailable error
      vi.spyOn(aiService as any, 'callKiroAI').mockRejectedValue(new Error('service unavailable'));
      
      await expect(
        aiService.generateCommitMessage('test', mockContext)
      ).rejects.toThrow(AIServiceUnavailableError);
    });

    it('should handle invalid responses', async () => {
      // Mock invalid response
      vi.spyOn(aiService as any, 'callKiroAI').mockResolvedValue('');
      
      await expect(
        aiService.generateCommitMessage('test', mockContext)
      ).rejects.toThrow(AIInvalidResponseError);
    });

    it('should handle null responses', async () => {
      // Mock null response
      vi.spyOn(aiService as any, 'callKiroAI').mockResolvedValue(null);
      
      await expect(
        aiService.generateCommitMessage('test', mockContext)
      ).rejects.toThrow(AIInvalidResponseError);
    });

    it('should handle generic errors', async () => {
      // Mock generic error
      vi.spyOn(aiService as any, 'callKiroAI').mockRejectedValue(new Error('Unknown error'));
      
      await expect(
        aiService.generateCommitMessage('test', mockContext)
      ).rejects.toThrow(AIServiceError);
    });
  });

  describe('Response Validation and Cleaning', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should clean markdown formatting from response', async () => {
      const mockResponse = '```\nfeat: add new feature\n```';
      vi.spyOn(aiService as any, 'callKiroAI').mockResolvedValue(mockResponse);
      
      const result = await aiService.generateCommitMessage('test', mockContext);
      expect(result).toBe('feat: add new feature');
      expect(result).not.toContain('```');
    });

    it('should clean inline code formatting', async () => {
      const mockResponse = 'feat: add `new feature` implementation';
      vi.spyOn(aiService as any, 'callKiroAI').mockResolvedValue(mockResponse);
      
      const result = await aiService.generateCommitMessage('test', mockContext);
      expect(result).toBe('feat: add new feature implementation');
    });

    it('should trim whitespace', async () => {
      const mockResponse = '   feat: add new feature   ';
      vi.spyOn(aiService as any, 'callKiroAI').mockResolvedValue(mockResponse);
      
      const result = await aiService.generateCommitMessage('test', mockContext);
      expect(result).toBe('feat: add new feature');
    });

    it('should handle multi-line responses', async () => {
      const mockResponse = 'feat: add new feature\n\nThis is a detailed description';
      vi.spyOn(aiService as any, 'callKiroAI').mockResolvedValue(mockResponse);
      
      const result = await aiService.generateCommitMessage('test', mockContext);
      expect(result).toBeTruthy();
    });

    it('should handle very long responses', async () => {
      const mockResponse = 'feat: ' + 'a'.repeat(200);
      vi.spyOn(aiService as any, 'callKiroAI').mockResolvedValue(mockResponse);
      
      const result = await aiService.generateCommitMessage('test', mockContext);
      expect(result.length).toBeLessThan(200);
    });
  });

  describe('Prompt Building', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should build prompt with diff information', () => {
      const buildPrompt = (aiService as any).buildPrompt.bind(aiService);
      const prompt = buildPrompt('base prompt', mockContext);
      
      expect(prompt).toContain('base prompt');
      expect(prompt).toContain('Files changed: 2');
      expect(prompt).toContain('Additions: 25, Deletions: 2');
      expect(prompt).toContain('src/components/Button.tsx');
    });

    it('should include conventional commit format when specified', () => {
      const buildPrompt = (aiService as any).buildPrompt.bind(aiService);
      mockContext.preferences.commitStyle = 'conventional';
      
      const prompt = buildPrompt('base prompt', mockContext);
      
      expect(prompt).toContain('conventional commit format');
      expect(prompt).toContain('type(scope): description');
    });

    it('should include scope inference when enabled', () => {
      const buildPrompt = (aiService as any).buildPrompt.bind(aiService);
      mockContext.preferences.analysisSettings.enableScopeInference = true;
      
      const prompt = buildPrompt('base prompt', mockContext);
      
      expect(prompt).toContain('Include appropriate scope');
    });

    it('should include project context when available', () => {
      const buildPrompt = (aiService as any).buildPrompt.bind(aiService);
      
      const prompt = buildPrompt('base prompt', mockContext);
      
      expect(prompt).toContain('Project context: test-project (typescript)');
    });

    it('should work without project context', () => {
      const buildPrompt = (aiService as any).buildPrompt.bind(aiService);
      delete mockContext.projectContext;
      
      const prompt = buildPrompt('base prompt', mockContext);
      
      expect(prompt).not.toContain('Project context:');
      expect(prompt).toContain('base prompt');
    });
  });

  describe('Commit Prompt Creation', () => {
    it('should create specific commit prompt', () => {
      const prompt = aiService.createCommitPrompt(mockDiff, CommitType.FEAT, 'components');
      
      expect(prompt).toContain('Generate a git commit message');
      expect(prompt).toContain('Changed files (2)');
      expect(prompt).toContain('Use commit type: feat');
      expect(prompt).toContain('Use scope: components');
      expect(prompt).toContain('conventional commit format');
    });

    it('should create prompt without commit type and scope', () => {
      const prompt = aiService.createCommitPrompt(mockDiff);
      
      expect(prompt).toContain('Generate a git commit message');
      expect(prompt).toContain('Changed files (2)');
      expect(prompt).not.toContain('Use commit type:');
      expect(prompt).not.toContain('Use scope:');
    });

    it('should include file details in prompt', () => {
      const prompt = aiService.createCommitPrompt(mockDiff);
      
      expect(prompt).toContain('src/components/Button.tsx (modified)');
      expect(prompt).toContain('src/components/__tests__/Button.test.tsx (added)');
      expect(prompt).toContain('Total changes: +25 -2');
    });

    it('should include commit message requirements', () => {
      const prompt = aiService.createCommitPrompt(mockDiff);
      
      expect(prompt).toContain('Keep the subject line under 50 characters');
      expect(prompt).toContain('Use imperative mood');
      expect(prompt).toContain('Be specific and descriptive');
    });
  });

  describe('Mock Response Generation', () => {
    it('should generate test-related responses', () => {
      const generateMockResponse = (aiService as any).generateMockResponse.bind(aiService);
      const response = generateMockResponse('add unit tests for validation');
      
      expect(response).toContain('test:');
    });

    it('should generate fix-related responses', () => {
      const generateMockResponse = (aiService as any).generateMockResponse.bind(aiService);
      const response = generateMockResponse('fix bug in validation logic');
      
      expect(response).toContain('fix:');
    });

    it('should generate docs-related responses', () => {
      const generateMockResponse = (aiService as any).generateMockResponse.bind(aiService);
      const response = generateMockResponse('update readme documentation');
      
      expect(response).toContain('docs:');
    });

    it('should generate refactor-related responses', () => {
      const generateMockResponse = (aiService as any).generateMockResponse.bind(aiService);
      const response = generateMockResponse('refactor component structure');
      
      expect(response).toContain('refactor:');
    });

    it('should generate default feat response', () => {
      const generateMockResponse = (aiService as any).generateMockResponse.bind(aiService);
      const response = generateMockResponse('some generic prompt');
      
      expect(response).toContain('feat:');
    });
  });

  describe('Error Classes', () => {
    it('should create AIServiceError with code', () => {
      const error = new AIServiceError('Test message', 'TEST_CODE');
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('AIServiceError');
    });

    it('should create AIServiceUnavailableError', () => {
      const error = new AIServiceUnavailableError();
      
      expect(error.message).toBe('AI service is currently unavailable');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should create AIRateLimitError', () => {
      const error = new AIRateLimitError();
      
      expect(error.message).toBe('AI service rate limit exceeded');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should create AIInvalidResponseError', () => {
      const error = new AIInvalidResponseError();
      
      expect(error.message).toBe('AI service returned invalid response');
      expect(error.code).toBe('INVALID_RESPONSE');
    });

    it('should allow custom messages for error classes', () => {
      const unavailableError = new AIServiceUnavailableError('Custom unavailable message');
      const rateLimitError = new AIRateLimitError('Custom rate limit message');
      const invalidResponseError = new AIInvalidResponseError('Custom invalid response message');
      
      expect(unavailableError.message).toBe('Custom unavailable message');
      expect(rateLimitError.message).toBe('Custom rate limit message');
      expect(invalidResponseError.message).toBe('Custom invalid response message');
    });
  });
});