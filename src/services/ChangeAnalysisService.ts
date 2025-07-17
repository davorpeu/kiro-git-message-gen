import { GitDiff, ChangedFile } from '../interfaces/GitService';
import { CommitType, ChangeAnalysis } from '../interfaces/CommitMessageGenerator';
import { ChangeAnalysisService, FileTypePattern, ScopePattern } from '../interfaces/ChangeAnalysis';

/**
 * Service for analyzing git changes to infer commit types and scopes
 * Implements logic to categorize file changes and suggest appropriate commit messages
 */
export class ChangeAnalysisServiceImpl implements ChangeAnalysisService {
    private readonly fileTypePatterns: FileTypePattern[] = [
        // Documentation files
        { pattern: /\.(md|txt|rst|adoc)$/i, category: 'docs', commitType: CommitType.DOCS, weight: 10 },
        { pattern: /^(README|CHANGELOG|LICENSE|CONTRIBUTING)/i, category: 'docs', commitType: CommitType.DOCS, weight: 15 },
        { pattern: /^docs?\//i, category: 'docs', commitType: CommitType.DOCS, weight: 12 },
        
        // Test files
        { pattern: /\.(test|spec)\.(js|ts|jsx|tsx|py|java|cs|rb|php)$/i, category: 'test', commitType: CommitType.TEST, weight: 12 },
        { pattern: /^(test|tests|spec|specs|__tests__)\//i, category: 'test', commitType: CommitType.TEST, weight: 10 },
        { pattern: /\.test\./i, category: 'test', commitType: CommitType.TEST, weight: 8 },
        
        // Configuration files
        { pattern: /\.(json|yaml|yml|toml|ini|cfg|conf)$/i, category: 'config', commitType: CommitType.CHORE, weight: 8 },
        { pattern: /^(package\.json|package-lock\.json|yarn\.lock|Gemfile|requirements\.txt|setup\.py|pom\.xml|build\.gradle)$/i, category: 'config', commitType: CommitType.CHORE, weight: 10 },
        { pattern: /\.(config|rc)$/i, category: 'config', commitType: CommitType.CHORE, weight: 8 },
        
        // Build and CI files
        { pattern: /^(Dockerfile|docker-compose|\.dockerignore)$/i, category: 'build', commitType: CommitType.CHORE, weight: 8 },
        { pattern: /^\.github\//i, category: 'ci', commitType: CommitType.CHORE, weight: 8 },
        { pattern: /\.(yml|yaml)$/i, category: 'ci', commitType: CommitType.CHORE, weight: 6 },
        
        // Style files
        { pattern: /\.(css|scss|sass|less|styl)$/i, category: 'style', commitType: CommitType.STYLE, weight: 10 },
        { pattern: /\.(html|htm)$/i, category: 'markup', commitType: CommitType.STYLE, weight: 6 },
        
        // Source code files (default to feat for new functionality)
        { pattern: /\.(js|ts|jsx|tsx|py|java|cs|rb|php|go|rs|cpp|c|h)$/i, category: 'source', commitType: CommitType.FEAT, weight: 5 },
        
        // Asset files
        { pattern: /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i, category: 'assets', commitType: CommitType.CHORE, weight: 4 },
    ];

    private readonly scopePatterns: ScopePattern[] = [
        // Frontend/UI related
        { pattern: /^(src\/)?components?\//i, scope: 'components', priority: 10 },
        { pattern: /^(src\/)?ui\//i, scope: 'ui', priority: 10 },
        { pattern: /^(src\/)?pages?\//i, scope: 'pages', priority: 9 },
        { pattern: /^(src\/)?views?\//i, scope: 'views', priority: 9 },
        
        // Backend/API related
        { pattern: /^(src\/)?api\//i, scope: 'api', priority: 10 },
        { pattern: /^(src\/)?services?\//i, scope: 'services', priority: 9 },
        { pattern: /^(src\/)?controllers?\//i, scope: 'controllers', priority: 9 },
        { pattern: /^(src\/)?models?\//i, scope: 'models', priority: 8 },
        { pattern: /^(src\/)?routes?\//i, scope: 'routes', priority: 8 },
        
        // Core functionality
        { pattern: /^(src\/)?core\//i, scope: 'core', priority: 8 },
        { pattern: /^(src\/)?lib\//i, scope: 'lib', priority: 7 },
        { pattern: /^(src\/)?utils?\//i, scope: 'utils', priority: 7 },
        { pattern: /^(src\/)?helpers?\//i, scope: 'helpers', priority: 7 },
        
        // Configuration and build
        { pattern: /^config\//i, scope: 'config', priority: 8 },
        { pattern: /^build\//i, scope: 'build', priority: 7 },
        { pattern: /^scripts?\//i, scope: 'scripts', priority: 6 },
        
        // Documentation
        { pattern: /^docs?\//i, scope: 'docs', priority: 8 },
        
        // Testing
        { pattern: /^(test|tests|spec|specs|__tests__)\//i, scope: 'tests', priority: 8 },
    ];

    /**
     * Analyze git changes and provide commit type and scope suggestions
     */
    analyzeChanges(diff: GitDiff): ChangeAnalysis {
        if (diff.files.length === 0) {
            return {
                commitType: CommitType.CHORE,
                description: 'No changes detected',
                impactLevel: 'minor',
                fileTypes: []
            };
        }

        const filePaths = diff.files.map(file => file.path);
        const changes = diff.files.map(file => ({ additions: file.additions, deletions: file.deletions }));
        
        const commitType = this.inferCommitType(filePaths, changes);
        const scope = this.detectScope(filePaths);
        const fileTypes = Object.keys(this.categorizeFilesByType(filePaths));
        const impactLevel = this.assessImpactLevel(diff.additions, diff.deletions, diff.files.length);
        const description = this.generateDescription(diff, commitType, fileTypes);

        return {
            commitType,
            scope,
            description,
            impactLevel,
            fileTypes
        };
    }

    /**
     * Infer the most appropriate commit type based on file patterns and changes
     */
    inferCommitType(files: string[], changes: { additions: number; deletions: number }[]): CommitType {
        const typeScores = new Map<CommitType, number>();
        
        // Initialize scores
        Object.values(CommitType).forEach(type => {
            typeScores.set(type, 0);
        });

        // Analyze each file
        files.forEach((file, index) => {
            const change = changes[index];
            const matchingPatterns = this.fileTypePatterns.filter(pattern => pattern.pattern.test(file));
            
            if (matchingPatterns.length > 0) {
                // Use the highest weighted pattern
                const bestPattern = matchingPatterns.reduce((best, current) => 
                    current.weight > best.weight ? current : best
                );
                
                let score = bestPattern.weight;
                
                // Adjust score based on change type
                if (change.additions > 0 && change.deletions === 0) {
                    // New file or pure additions
                    if (bestPattern.commitType === CommitType.FEAT) {
                        score *= 1.5; // Boost feat for new functionality
                    }
                } else if (change.deletions > change.additions) {
                    // More deletions than additions might indicate refactoring or fixes
                    if (bestPattern.commitType === CommitType.REFACTOR || bestPattern.commitType === CommitType.FIX) {
                        score *= 1.3;
                    }
                }
                
                typeScores.set(bestPattern.commitType, (typeScores.get(bestPattern.commitType) || 0) + score);
            } else {
                // Default scoring for unmatched files
                typeScores.set(CommitType.FEAT, (typeScores.get(CommitType.FEAT) || 0) + 3);
            }
        });

        // Special logic for specific scenarios
        const totalChanges = changes.reduce((sum, change) => sum + change.additions + change.deletions, 0);
        const hasOnlyDeletions = changes.every(change => change.additions === 0 && change.deletions > 0);
        const hasLargeDeletions = changes.some(change => change.deletions > change.additions * 2);
        const hasSignificantRefactoring = changes.some(change => change.deletions > 50 && change.additions > 10);

        if (hasOnlyDeletions) {
            typeScores.set(CommitType.CHORE, (typeScores.get(CommitType.CHORE) || 0) + 10);
        } else if (hasLargeDeletions && totalChanges > 50) {
            typeScores.set(CommitType.REFACTOR, (typeScores.get(CommitType.REFACTOR) || 0) + 15);
        } else if (hasSignificantRefactoring) {
            typeScores.set(CommitType.REFACTOR, (typeScores.get(CommitType.REFACTOR) || 0) + 12);
        }

        // Find the commit type with the highest score
        let bestType = CommitType.FEAT;
        let bestScore = 0;
        
        typeScores.forEach((score, type) => {
            if (score > bestScore) {
                bestScore = score;
                bestType = type;
            }
        });

        return bestType;
    }

    /**
     * Detect the most appropriate scope based on file paths
     */
    detectScope(files: string[]): string | undefined {
        const scopeScores = new Map<string, number>();

        files.forEach(file => {
            const matchingPatterns = this.scopePatterns.filter(pattern => pattern.pattern.test(file));
            
            matchingPatterns.forEach(pattern => {
                const currentScore = scopeScores.get(pattern.scope) || 0;
                scopeScores.set(pattern.scope, currentScore + pattern.priority);
            });
        });

        if (scopeScores.size === 0) {
            return undefined;
        }

        // Return the scope with the highest score
        let bestScope = '';
        let bestScore = 0;
        
        scopeScores.forEach((score, scope) => {
            if (score > bestScore) {
                bestScore = score;
                bestScope = scope;
            }
        });

        return bestScope || undefined;
    }

    /**
     * Categorize files by their type/purpose
     */
    categorizeFilesByType(files: string[]): Record<string, string[]> {
        const categories: Record<string, string[]> = {};

        files.forEach(file => {
            const matchingPatterns = this.fileTypePatterns.filter(pattern => pattern.pattern.test(file));
            
            if (matchingPatterns.length > 0) {
                const bestPattern = matchingPatterns.reduce((best, current) => 
                    current.weight > best.weight ? current : best
                );
                
                if (!categories[bestPattern.category]) {
                    categories[bestPattern.category] = [];
                }
                categories[bestPattern.category].push(file);
            } else {
                // Uncategorized files
                if (!categories['other']) {
                    categories['other'] = [];
                }
                categories['other'].push(file);
            }
        });

        return categories;
    }

    /**
     * Assess the impact level of changes based on quantity and scope
     */
    assessImpactLevel(additions: number, deletions: number, fileCount: number): "minor" | "moderate" | "major" {
        const totalChanges = additions + deletions;
        
        // Major impact criteria
        if (fileCount > 10 || totalChanges > 200) {
            return 'major';
        }
        
        // Moderate impact criteria
        if (fileCount > 3 || totalChanges > 50) {
            return 'moderate';
        }
        
        // Minor impact (default)
        return 'minor';
    }

    /**
     * Generate a descriptive summary of the changes
     */
    private generateDescription(diff: GitDiff, commitType: CommitType, fileTypes: string[]): string {
        const fileCount = diff.files.length;
        
        if (fileCount === 1) {
            const file = diff.files[0];
            const fileName = file.path.split('/').pop() || file.path;
            
            switch (file.status) {
                case 'added':
                    return `add ${fileName}`;
                case 'deleted':
                    return `remove ${fileName}`;
                case 'renamed':
                    return `rename ${fileName}`;
                default:
                    return `update ${fileName}`;
            }
        }
        
        // Multiple files
        const primaryFileType = fileTypes.length > 0 ? fileTypes[0] : 'files';
        const actionWord = this.getActionWord(commitType, diff);
        
        if (fileTypes.length === 1) {
            return `${actionWord} ${primaryFileType}`;
        } else if (fileTypes.length > 1) {
            return `${actionWord} ${primaryFileType} and other files`;
        } else {
            return `${actionWord} multiple files`;
        }
    }

    /**
     * Get appropriate action word based on commit type and changes
     */
    private getActionWord(commitType: CommitType, diff: GitDiff): string {
        const hasAdditions = diff.additions > 0;
        const hasDeletions = diff.deletions > 0;
        
        switch (commitType) {
            case CommitType.FEAT:
                return hasAdditions && !hasDeletions ? 'add' : 'implement';
            case CommitType.FIX:
                return 'fix';
            case CommitType.DOCS:
                return hasAdditions && !hasDeletions ? 'add' : 'update';
            case CommitType.STYLE:
                return 'style';
            case CommitType.REFACTOR:
                return 'refactor';
            case CommitType.TEST:
                return hasAdditions && !hasDeletions ? 'add' : 'update';
            case CommitType.CHORE:
                if (hasDeletions && !hasAdditions) {
                    return 'remove';
                }
                return hasAdditions && !hasDeletions ? 'add' : 'update';
            default:
                return 'update';
        }
    }
}