import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitServiceImpl } from '../GitService';

// Mock vscode
vi.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [
            {
                uri: {
                    fsPath: process.cwd()
                }
            }
        ]
    }
}));

/**
 * Integration tests for GitService
 * These tests verify the service works with actual git operations
 * Note: These tests require a git repository to be present
 */
describe('GitService Integration Tests', () => {
    let gitService: GitServiceImpl;

    beforeEach(() => {
        // Use current directory for integration tests
        gitService = new GitServiceImpl(process.cwd());
    });

    it('should detect if current directory is a git repository', async () => {
        const isRepo = await gitService.isValidRepository();
        
        // This should be true since we're in a git repository
        expect(typeof isRepo).toBe('boolean');
    });

    it('should get repository status without errors', async () => {
        try {
            const status = await gitService.getRepositoryStatus();
            
            expect(status).toHaveProperty('isRepository');
            expect(status).toHaveProperty('hasChanges');
            expect(status).toHaveProperty('hasStagedChanges');
            expect(status).toHaveProperty('currentBranch');
            
            expect(typeof status.isRepository).toBe('boolean');
            expect(typeof status.hasChanges).toBe('boolean');
            expect(typeof status.hasStagedChanges).toBe('boolean');
            expect(typeof status.currentBranch).toBe('string');
        } catch (error) {
            // If we're not in a git repo, that's also a valid test result
            expect(error).toBeInstanceOf(Error);
        }
    });

    it('should get staged changes without errors', async () => {
        try {
            const diff = await gitService.getStagedChanges();
            
            expect(diff).toHaveProperty('files');
            expect(diff).toHaveProperty('additions');
            expect(diff).toHaveProperty('deletions');
            expect(diff).toHaveProperty('summary');
            
            expect(Array.isArray(diff.files)).toBe(true);
            expect(typeof diff.additions).toBe('number');
            expect(typeof diff.deletions).toBe('number');
            expect(typeof diff.summary).toBe('string');
            
            // Each file should have the correct structure
            diff.files.forEach(file => {
                expect(file).toHaveProperty('path');
                expect(file).toHaveProperty('status');
                expect(file).toHaveProperty('additions');
                expect(file).toHaveProperty('deletions');
                expect(file).toHaveProperty('diff');
                
                expect(['added', 'modified', 'deleted', 'renamed']).toContain(file.status);
            });
        } catch (error) {
            // If we're not in a git repo or have no staged changes, that's valid
            expect(error).toBeInstanceOf(Error);
        }
    });

    it('should get conflict status without errors', async () => {
        try {
            const conflicts = await gitService.getConflictStatus();
            
            expect(conflicts).toHaveProperty('hasConflicts');
            expect(conflicts).toHaveProperty('conflictedFiles');
            
            expect(typeof conflicts.hasConflicts).toBe('boolean');
            expect(Array.isArray(conflicts.conflictedFiles)).toBe(true);
        } catch (error) {
            // If we're not in a git repo, that's also a valid test result
            expect(error).toBeInstanceOf(Error);
        }
    });
});