import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { simpleGit } from 'simple-git';
import { GitServiceImpl } from '../GitService';
import { RepoStatus, GitDiff, ConflictInfo } from '../../interfaces/GitService';

// Mock vscode
vi.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [
            {
                uri: {
                    fsPath: '/test/workspace'
                }
            }
        ]
    }
}));

// Mock simple-git
vi.mock('simple-git', () => ({
    simpleGit: vi.fn()
}));

describe('GitServiceImpl', () => {
    let gitService: GitServiceImpl;
    let mockGit: any;

    beforeEach(() => {
        mockGit = {
            status: vi.fn(),
            diff: vi.fn()
        };
        
        (simpleGit as any).mockReturnValue(mockGit);
        gitService = new GitServiceImpl('/test/workspace');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('isValidRepository', () => {
        it('should return true when git status succeeds', async () => {
            mockGit.status.mockResolvedValue({});
            
            const result = await gitService.isValidRepository();
            
            expect(result).toBe(true);
            expect(mockGit.status).toHaveBeenCalledOnce();
        });

        it('should return false when git status fails', async () => {
            mockGit.status.mockRejectedValue(new Error('Not a git repository'));
            
            const result = await gitService.isValidRepository();
            
            expect(result).toBe(false);
        });
    });

    describe('getRepositoryStatus', () => {
        it('should return correct status for valid repository with staged changes', async () => {
            const mockStatus = {
                current: 'main',
                files: ['file1.ts', 'file2.ts'],
                staged: ['file1.ts'],
                created: [],
                deleted: [],
                renamed: [],
                conflicted: []
            };
            
            mockGit.status.mockResolvedValue(mockStatus);
            
            const result: RepoStatus = await gitService.getRepositoryStatus();
            
            expect(result).toEqual({
                isRepository: true,
                hasChanges: true,
                hasStagedChanges: true,
                currentBranch: 'main'
            });
        });

        it('should return correct status for valid repository without changes', async () => {
            const mockStatus = {
                current: 'develop',
                files: [],
                staged: [],
                created: [],
                deleted: [],
                renamed: [],
                conflicted: []
            };
            
            mockGit.status.mockResolvedValue(mockStatus);
            
            const result: RepoStatus = await gitService.getRepositoryStatus();
            
            expect(result).toEqual({
                isRepository: true,
                hasChanges: false,
                hasStagedChanges: false,
                currentBranch: 'develop'
            });
        });

        it('should return invalid repository status when not a git repo', async () => {
            mockGit.status.mockRejectedValue(new Error('Not a git repository'));
            
            const result: RepoStatus = await gitService.getRepositoryStatus();
            
            expect(result).toEqual({
                isRepository: false,
                hasChanges: false,
                hasStagedChanges: false,
                currentBranch: ''
            });
        });

        it('should handle missing current branch', async () => {
            const mockStatus = {
                current: null,
                files: [],
                staged: [],
                created: [],
                deleted: [],
                renamed: [],
                conflicted: []
            };
            
            mockGit.status.mockResolvedValue(mockStatus);
            
            const result: RepoStatus = await gitService.getRepositoryStatus();
            
            expect(result.currentBranch).toBe('HEAD');
        });
    });

    describe('getStagedChanges', () => {
        it('should return empty diff when no staged changes', async () => {
            const mockStatus = {
                current: 'main',
                files: [],
                staged: [],
                created: [],
                deleted: [],
                renamed: [],
                conflicted: []
            };
            
            mockGit.status.mockResolvedValue(mockStatus);
            
            const result: GitDiff = await gitService.getStagedChanges();
            
            expect(result).toEqual({
                files: [],
                additions: 0,
                deletions: 0,
                summary: 'No staged changes'
            });
        });

        it('should return correct diff for staged changes', async () => {
            const mockStatus = {
                current: 'main',
                files: ['src/test.ts'],
                staged: ['src/test.ts'],
                created: ['src/test.ts'],
                deleted: [],
                renamed: [],
                conflicted: []
            };
            
            const mockNumstat = '10\t5\tsrc/test.ts';
            const mockFileDiff = `diff --git a/src/test.ts b/src/test.ts
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/src/test.ts
@@ -0,0 +1,10 @@
+export function test() {
+    return 'hello world';
+}`;
            
            mockGit.status.mockResolvedValue(mockStatus);
            mockGit.diff.mockImplementation((args: any) => {
                if (args.includes('--numstat')) {
                    return Promise.resolve(mockNumstat);
                }
                if (args.includes('src/test.ts')) {
                    return Promise.resolve(mockFileDiff);
                }
                return Promise.resolve('');
            });
            
            const result: GitDiff = await gitService.getStagedChanges();
            
            expect(result.files).toHaveLength(1);
            expect(result.files[0]).toEqual({
                path: 'src/test.ts',
                status: 'added',
                additions: 10,
                deletions: 5,
                diff: mockFileDiff
            });
            expect(result.additions).toBe(10);
            expect(result.deletions).toBe(5);
            expect(result.summary).toBe('1 file changed (10 additions, 5 deletions)');
        });

        it('should handle multiple staged files', async () => {
            const mockStatus = {
                current: 'main',
                files: ['file1.ts', 'file2.ts'],
                staged: ['file1.ts', 'file2.ts'],
                created: ['file1.ts'],
                deleted: [],
                renamed: [],
                conflicted: []
            };
            
            const mockNumstat = '5\t2\tfile1.ts\n3\t1\tfile2.ts';
            
            mockGit.status.mockResolvedValue(mockStatus);
            mockGit.diff.mockImplementation((args: any) => {
                if (args.includes('--numstat')) {
                    return Promise.resolve(mockNumstat);
                }
                return Promise.resolve('mock diff content');
            });
            
            const result: GitDiff = await gitService.getStagedChanges();
            
            expect(result.files).toHaveLength(2);
            expect(result.additions).toBe(8);
            expect(result.deletions).toBe(3);
            expect(result.summary).toBe('2 files changed (8 additions, 3 deletions)');
        });

        it('should throw error when not a git repository', async () => {
            mockGit.status.mockRejectedValue(new Error('Not a git repository'));
            
            await expect(gitService.getStagedChanges()).rejects.toThrow('Not a git repository');
        });

        it('should handle deleted files', async () => {
            const mockStatus = {
                current: 'main',
                files: ['deleted.ts'],
                staged: ['deleted.ts'],
                created: [],
                deleted: ['deleted.ts'],
                renamed: [],
                conflicted: []
            };
            
            const mockNumstat = '0\t10\tdeleted.ts';
            
            mockGit.status.mockResolvedValue(mockStatus);
            mockGit.diff.mockImplementation((args: any) => {
                if (args.includes('--numstat')) {
                    return Promise.resolve(mockNumstat);
                }
                return Promise.resolve('deleted file diff');
            });
            
            const result: GitDiff = await gitService.getStagedChanges();
            
            expect(result.files[0].status).toBe('deleted');
            expect(result.files[0].additions).toBe(0);
            expect(result.files[0].deletions).toBe(10);
        });

        it('should handle renamed files', async () => {
            const mockStatus = {
                current: 'main',
                files: ['newname.ts'],
                staged: ['newname.ts'],
                created: [],
                deleted: [],
                renamed: [{ from: 'oldname.ts', to: 'newname.ts' }],
                conflicted: []
            };
            
            const mockNumstat = '0\t0\tnewname.ts';
            
            mockGit.status.mockResolvedValue(mockStatus);
            mockGit.diff.mockImplementation((args: any) => {
                if (args.includes('--numstat')) {
                    return Promise.resolve(mockNumstat);
                }
                return Promise.resolve('renamed file diff');
            });
            
            const result: GitDiff = await gitService.getStagedChanges();
            
            expect(result.files[0].status).toBe('renamed');
        });
    });

    describe('getConflictStatus', () => {
        it('should return no conflicts when repository is clean', async () => {
            const mockStatus = {
                current: 'main',
                files: [],
                staged: [],
                created: [],
                deleted: [],
                renamed: [],
                conflicted: []
            };
            
            mockGit.status.mockResolvedValue(mockStatus);
            
            const result: ConflictInfo = await gitService.getConflictStatus();
            
            expect(result).toEqual({
                hasConflicts: false,
                conflictedFiles: []
            });
        });

        it('should return conflicts when they exist', async () => {
            const mockStatus = {
                current: 'main',
                files: ['conflict1.ts', 'conflict2.ts'],
                staged: [],
                created: [],
                deleted: [],
                renamed: [],
                conflicted: ['conflict1.ts', 'conflict2.ts']
            };
            
            mockGit.status.mockResolvedValue(mockStatus);
            
            const result: ConflictInfo = await gitService.getConflictStatus();
            
            expect(result).toEqual({
                hasConflicts: true,
                conflictedFiles: ['conflict1.ts', 'conflict2.ts']
            });
        });

        it('should return no conflicts when not a git repository', async () => {
            mockGit.status.mockRejectedValue(new Error('Not a git repository'));
            
            const result: ConflictInfo = await gitService.getConflictStatus();
            
            expect(result).toEqual({
                hasConflicts: false,
                conflictedFiles: []
            });
        });

        it('should handle undefined conflicted array', async () => {
            const mockStatus = {
                current: 'main',
                files: [],
                staged: [],
                created: [],
                deleted: [],
                renamed: [],
                conflicted: undefined
            };
            
            mockGit.status.mockResolvedValue(mockStatus);
            
            const result: ConflictInfo = await gitService.getConflictStatus();
            
            expect(result).toEqual({
                hasConflicts: false,
                conflictedFiles: []
            });
        });
    });

    describe('constructor', () => {
        it('should use provided workspace root', () => {
            const customPath = '/custom/path';
            const service = new GitServiceImpl(customPath);
            
            expect(simpleGit).toHaveBeenCalledWith(customPath);
        });

        it('should use vscode workspace when no path provided', () => {
            const service = new GitServiceImpl();
            
            expect(simpleGit).toHaveBeenCalledWith('/test/workspace');
        });

        it('should throw error when no workspace folders exist', () => {
            // Mock empty workspace folders
            vi.mocked(vscode.workspace).workspaceFolders = [];
            
            expect(() => new GitServiceImpl()).toThrow('No workspace folder is open');
        });
    });

    describe('error handling', () => {
        it('should handle git command failures gracefully', async () => {
            mockGit.status.mockResolvedValue({
                current: 'main',
                files: ['test.ts'],
                staged: ['test.ts'],
                created: [],
                deleted: [],
                renamed: [],
                conflicted: []
            });
            
            mockGit.diff.mockRejectedValue(new Error('Git command failed'));
            
            await expect(gitService.getStagedChanges()).rejects.toThrow('Failed to get staged changes');
        });

        it('should provide meaningful error messages for getStagedChanges', async () => {
            mockGit.status.mockRejectedValue(new Error('Custom git error'));
            
            await expect(gitService.getStagedChanges()).rejects.toThrow('Not a git repository');
        });
    });
});