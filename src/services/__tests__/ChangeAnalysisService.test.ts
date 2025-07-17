import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeAnalysisServiceImpl } from '../ChangeAnalysisService';
import { GitDiff, ChangedFile } from '../../interfaces/GitService';
import { CommitType } from '../../interfaces/CommitMessageGenerator';

describe('ChangeAnalysisService', () => {
    let service: ChangeAnalysisServiceImpl;

    beforeEach(() => {
        service = new ChangeAnalysisServiceImpl();
    });

    describe('analyzeChanges', () => {
        it('should return chore type for empty changes', () => {
            const diff: GitDiff = {
                files: [],
                additions: 0,
                deletions: 0,
                summary: 'No changes'
            };

            const result = service.analyzeChanges(diff);

            expect(result.commitType).toBe(CommitType.CHORE);
            expect(result.description).toBe('No changes detected');
            expect(result.impactLevel).toBe('minor');
            expect(result.fileTypes).toEqual([]);
        });

        it('should analyze single file changes correctly', () => {
            const diff: GitDiff = {
                files: [{
                    path: 'src/components/Button.tsx',
                    status: 'modified',
                    additions: 10,
                    deletions: 2,
                    diff: 'mock diff'
                }],
                additions: 10,
                deletions: 2,
                summary: '1 file changed'
            };

            const result = service.analyzeChanges(diff);

            expect(result.commitType).toBe(CommitType.FEAT);
            expect(result.scope).toBe('components');
            expect(result.description).toBe('update Button.tsx');
            expect(result.impactLevel).toBe('minor');
            expect(result.fileTypes).toContain('source');
        });

        it('should detect documentation changes', () => {
            const diff: GitDiff = {
                files: [{
                    path: 'README.md',
                    status: 'modified',
                    additions: 5,
                    deletions: 1,
                    diff: 'mock diff'
                }],
                additions: 5,
                deletions: 1,
                summary: '1 file changed'
            };

            const result = service.analyzeChanges(diff);

            expect(result.commitType).toBe(CommitType.DOCS);
            expect(result.description).toBe('update README.md');
            expect(result.fileTypes).toContain('docs');
        });

        it('should detect test file changes', () => {
            const diff: GitDiff = {
                files: [{
                    path: 'src/components/Button.test.tsx',
                    status: 'added',
                    additions: 25,
                    deletions: 0,
                    diff: 'mock diff'
                }],
                additions: 25,
                deletions: 0,
                summary: '1 file changed'
            };

            const result = service.analyzeChanges(diff);

            expect(result.commitType).toBe(CommitType.TEST);
            expect(result.scope).toBe('components');
            expect(result.description).toBe('add Button.test.tsx');
            expect(result.fileTypes).toContain('test');
        });
    });

    describe('inferCommitType', () => {
        it('should infer DOCS for documentation files', () => {
            const files = ['README.md', 'docs/api.md'];
            const changes = [
                { additions: 10, deletions: 2 },
                { additions: 5, deletions: 0 }
            ];

            const result = service.inferCommitType(files, changes);

            expect(result).toBe(CommitType.DOCS);
        });

        it('should infer TEST for test files', () => {
            const files = ['src/utils/helper.test.ts', 'tests/integration.spec.js'];
            const changes = [
                { additions: 15, deletions: 0 },
                { additions: 20, deletions: 5 }
            ];

            const result = service.inferCommitType(files, changes);

            expect(result).toBe(CommitType.TEST);
        });

        it('should infer STYLE for CSS files', () => {
            const files = ['src/styles/main.css', 'components/Button.scss'];
            const changes = [
                { additions: 8, deletions: 3 },
                { additions: 12, deletions: 1 }
            ];

            const result = service.inferCommitType(files, changes);

            expect(result).toBe(CommitType.STYLE);
        });

        it('should infer CHORE for configuration files', () => {
            const files = ['package.json', '.gitignore'];
            const changes = [
                { additions: 2, deletions: 0 },
                { additions: 1, deletions: 0 }
            ];

            const result = service.inferCommitType(files, changes);

            expect(result).toBe(CommitType.CHORE);
        });

        it('should infer FEAT for source code files', () => {
            const files = ['src/services/ApiService.ts', 'src/utils/validator.js'];
            const changes = [
                { additions: 50, deletions: 5 },
                { additions: 20, deletions: 0 }
            ];

            const result = service.inferCommitType(files, changes);

            expect(result).toBe(CommitType.FEAT);
        });

        it('should infer REFACTOR for files with large deletions', () => {
            const files = ['src/legacy/OldService.ts'];
            const changes = [
                { additions: 10, deletions: 100 }
            ];

            const result = service.inferCommitType(files, changes);

            expect(result).toBe(CommitType.REFACTOR);
        });

        it('should infer CHORE for pure deletions', () => {
            const files = ['src/unused/OldComponent.tsx', 'temp/debug.log'];
            const changes = [
                { additions: 0, deletions: 50 },
                { additions: 0, deletions: 10 }
            ];

            const result = service.inferCommitType(files, changes);

            expect(result).toBe(CommitType.CHORE);
        });

        it('should handle mixed file types by prioritizing highest weighted patterns', () => {
            const files = [
                'README.md',           // docs (weight 15)
                'src/App.tsx',         // source (weight 5)
                'package.json'         // config (weight 10)
            ];
            const changes = [
                { additions: 5, deletions: 0 },
                { additions: 20, deletions: 5 },
                { additions: 1, deletions: 0 }
            ];

            const result = service.inferCommitType(files, changes);

            expect(result).toBe(CommitType.DOCS);
        });
    });

    describe('detectScope', () => {
        it('should detect components scope', () => {
            const files = ['src/components/Button.tsx', 'src/components/Modal.tsx'];
            const result = service.detectScope(files);
            expect(result).toBe('components');
        });

        it('should detect api scope', () => {
            const files = ['src/api/users.ts', 'src/api/auth.ts'];
            const result = service.detectScope(files);
            expect(result).toBe('api');
        });

        it('should detect services scope', () => {
            const files = ['src/services/UserService.ts'];
            const result = service.detectScope(files);
            expect(result).toBe('services');
        });

        it('should detect docs scope', () => {
            const files = ['docs/installation.md', 'docs/api-reference.md'];
            const result = service.detectScope(files);
            expect(result).toBe('docs');
        });

        it('should detect tests scope', () => {
            const files = ['tests/unit/user.test.js', '__tests__/integration.test.js'];
            const result = service.detectScope(files);
            expect(result).toBe('tests');
        });

        it('should return undefined for files without clear scope', () => {
            const files = ['random-file.txt', 'another-file.log'];
            const result = service.detectScope(files);
            expect(result).toBeUndefined();
        });

        it('should prioritize higher priority scopes', () => {
            const files = [
                'src/components/Button.tsx',  // components (priority 10)
                'src/utils/helper.ts'         // utils (priority 7)
            ];
            const result = service.detectScope(files);
            expect(result).toBe('components');
        });

        it('should handle mixed scopes by selecting highest scoring', () => {
            const files = [
                'src/api/users.ts',           // api (priority 10)
                'src/api/auth.ts',            // api (priority 10) - total 20
                'src/components/Button.tsx'   // components (priority 10) - total 10
            ];
            const result = service.detectScope(files);
            expect(result).toBe('api');
        });
    });

    describe('categorizeFilesByType', () => {
        it('should categorize files correctly', () => {
            const files = [
                'README.md',
                'src/App.tsx',
                'src/App.test.tsx',
                'package.json',
                'src/styles/main.css'
            ];

            const result = service.categorizeFilesByType(files);

            expect(result.docs).toContain('README.md');
            expect(result.source).toContain('src/App.tsx');
            expect(result.test).toContain('src/App.test.tsx');
            expect(result.config).toContain('package.json');
            expect(result.style).toContain('src/styles/main.css');
        });

        it('should handle uncategorized files', () => {
            const files = ['random-file.xyz', 'unknown.extension'];
            const result = service.categorizeFilesByType(files);

            expect(result.other).toContain('random-file.xyz');
            expect(result.other).toContain('unknown.extension');
        });

        it('should prioritize higher weighted patterns', () => {
            const files = ['package.json']; // matches both config patterns
            const result = service.categorizeFilesByType(files);

            expect(result.config).toContain('package.json');
            expect(Object.keys(result)).toHaveLength(1);
        });
    });

    describe('assessImpactLevel', () => {
        it('should return minor for small changes', () => {
            const result = service.assessImpactLevel(10, 5, 2);
            expect(result).toBe('minor');
        });

        it('should return moderate for medium changes', () => {
            const result = service.assessImpactLevel(30, 20, 4);
            expect(result).toBe('moderate');
        });

        it('should return major for large changes by file count', () => {
            const result = service.assessImpactLevel(20, 10, 15);
            expect(result).toBe('major');
        });

        it('should return major for large changes by total changes', () => {
            const result = service.assessImpactLevel(150, 100, 5);
            expect(result).toBe('major');
        });

        it('should return moderate for moderate file count', () => {
            const result = service.assessImpactLevel(20, 10, 5);
            expect(result).toBe('moderate');
        });

        it('should return moderate for moderate total changes', () => {
            const result = service.assessImpactLevel(40, 20, 2);
            expect(result).toBe('moderate');
        });
    });

    describe('integration scenarios', () => {
        it('should handle feature development scenario', () => {
            const diff: GitDiff = {
                files: [
                    {
                        path: 'src/components/UserProfile.tsx',
                        status: 'added',
                        additions: 45,
                        deletions: 0,
                        diff: 'mock diff'
                    },
                    {
                        path: 'src/components/UserProfile.test.tsx',
                        status: 'added',
                        additions: 30,
                        deletions: 0,
                        diff: 'mock diff'
                    }
                ],
                additions: 75,
                deletions: 0,
                summary: '2 files changed'
            };

            const result = service.analyzeChanges(diff);

            expect(result.commitType).toBe(CommitType.TEST); // Test files have higher weight
            expect(result.scope).toBe('components');
            expect(result.impactLevel).toBe('moderate');
            expect(result.fileTypes).toContain('test');
            expect(result.fileTypes).toContain('source');
        });

        it('should handle bug fix scenario', () => {
            const diff: GitDiff = {
                files: [
                    {
                        path: 'src/services/AuthService.ts',
                        status: 'modified',
                        additions: 5,
                        deletions: 8,
                        diff: 'mock diff'
                    }
                ],
                additions: 5,
                deletions: 8,
                summary: '1 file changed'
            };

            const result = service.analyzeChanges(diff);

            expect(result.commitType).toBe(CommitType.FEAT); // Source files default to feat
            expect(result.scope).toBe('services');
            expect(result.impactLevel).toBe('minor');
            expect(result.description).toBe('update AuthService.ts');
        });

        it('should handle documentation update scenario', () => {
            const diff: GitDiff = {
                files: [
                    {
                        path: 'docs/api-guide.md',
                        status: 'modified',
                        additions: 15,
                        deletions: 3,
                        diff: 'mock diff'
                    },
                    {
                        path: 'README.md',
                        status: 'modified',
                        additions: 8,
                        deletions: 2,
                        diff: 'mock diff'
                    }
                ],
                additions: 23,
                deletions: 5,
                summary: '2 files changed'
            };

            const result = service.analyzeChanges(diff);

            expect(result.commitType).toBe(CommitType.DOCS);
            expect(result.scope).toBe('docs');
            expect(result.impactLevel).toBe('minor');
            expect(result.fileTypes).toContain('docs');
        });

        it('should handle refactoring scenario', () => {
            const diff: GitDiff = {
                files: [
                    {
                        path: 'src/utils/legacy-helper.ts',
                        status: 'modified',
                        additions: 20,
                        deletions: 80,
                        diff: 'mock diff'
                    },
                    {
                        path: 'src/utils/modern-helper.ts',
                        status: 'added',
                        additions: 60,
                        deletions: 0,
                        diff: 'mock diff'
                    }
                ],
                additions: 80,
                deletions: 80,
                summary: '2 files changed'
            };

            const result = service.analyzeChanges(diff);

            expect(result.commitType).toBe(CommitType.REFACTOR);
            expect(result.scope).toBe('utils');
            expect(result.impactLevel).toBe('moderate');
        });

        it('should handle cleanup scenario', () => {
            const diff: GitDiff = {
                files: [
                    {
                        path: 'src/deprecated/OldComponent.tsx',
                        status: 'deleted',
                        additions: 0,
                        deletions: 120,
                        diff: 'mock diff'
                    },
                    {
                        path: 'temp/debug.log',
                        status: 'deleted',
                        additions: 0,
                        deletions: 50,
                        diff: 'mock diff'
                    }
                ],
                additions: 0,
                deletions: 170,
                summary: '2 files changed'
            };

            const result = service.analyzeChanges(diff);

            expect(result.commitType).toBe(CommitType.CHORE);
            expect(result.impactLevel).toBe('moderate');
        });
    });
});