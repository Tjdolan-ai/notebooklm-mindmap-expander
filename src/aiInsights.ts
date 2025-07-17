/**
 * AI Insights for NotebookLM Mind Maps
 * Analyzes mind map structure and generates insights using Chrome AI APIs or client-side NLP
 */

interface MindMapNode {
  id: string;
  text: string;
  depth: number;
  children: MindMapNode[];
  element: Element;
}

interface InsightData {
  mainBranches: string[];
  suggestedConnections: Array<{
    from: string;
    to: string;
    reason: string;
  }>;
  missingTopics: string[];
  summary: string;
}

export class AIInsightsAnalyzer {
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 500;
  private cachedInsights: InsightData | null = null;
  private lastAnalysisHash: string = '';

  constructor(private isDarkTheme: boolean = false) {
    // isDarkTheme is used for theming in modal creation methods
    void this.isDarkTheme; // Suppress unused warning
  }

  /**
   * Debounced analysis trigger
   */
  public analyzeWithDebounce(): Promise<InsightData> {
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(async () => {
        const insights = await this.performAnalysis();
        resolve(insights);
      }, this.DEBOUNCE_DELAY);
    });
  }

  /**
   * Main analysis function
   */
  private async performAnalysis(): Promise<InsightData> {
    try {
      const mindMapData = this.extractMindMapStructure();
      const currentHash = this.generateDataHash(mindMapData);

      // Return cached results if data hasn't changed
      if (this.cachedInsights && this.lastAnalysisHash === currentHash) {
        return this.cachedInsights;
      }

      const insights = await this.generateInsights(mindMapData);
      
      // Cache results
      this.cachedInsights = insights;
      this.lastAnalysisHash = currentHash;
      
      return insights;
    } catch (error) {
      console.error('AI Insights analysis failed:', error);
      return this.getFallbackInsights();
    }
  }

  /**
   * Extract mind map structure from DOM
   */
  private extractMindMapStructure(): MindMapNode[] {
    const nodes: MindMapNode[] = [];
    const processedNodes = new Set<string>();

    try {
      // Find all node groups in the SVG
      const nodeElements = document.querySelectorAll('g.node');
      
      nodeElements.forEach((nodeElement, index) => {
        const textElements = nodeElement.querySelectorAll('text');
        let nodeText = '';
        
        // Extract text content, skipping expand/collapse symbols
        textElements.forEach(text => {
          const content = text.textContent?.trim();
          if (content && content !== '>' && content !== '<' && content !== '∨' && content !== '∧') {
            nodeText += content + ' ';
          }
        });

        nodeText = nodeText.trim();
        
        if (nodeText && !processedNodes.has(nodeText)) {
          processedNodes.add(nodeText);
          
          const node: MindMapNode = {
            id: this.generateNodeId(nodeElement, index),
            text: nodeText,
            depth: this.estimateNodeDepth(nodeElement),
            children: [],
            element: nodeElement
          };
          
          nodes.push(node);
        }
      });

      // Sort by depth and build hierarchy
      return this.buildHierarchy(nodes);
    } catch (error) {
      console.error('Error extracting mind map structure:', error);
      return [];
    }
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(element: Element, index: number): string {
    // Try to use data attributes if available
    const dataId = element.getAttribute('data-node-id') || 
                   element.getAttribute('id') ||
                   element.closest('[data-node-id]')?.getAttribute('data-node-id');
    
    if (dataId) return dataId;
    
    // Fallback to position-based ID
    const rect = element.getBoundingClientRect();
    return `node-${index}-${Math.round(rect.x)}-${Math.round(rect.y)}`;
  }

  /**
   * Estimate node depth in hierarchy
   */
  private estimateNodeDepth(node: Element): number {
    let depth = 0;
    let current = node.parentElement;
    
    while (current && depth < 10) {
      if (current.tagName.toLowerCase() === 'g') {
        depth++;
      }
      current = current.parentElement;
    }
    
    return Math.max(0, depth - 2); // Adjust for SVG structure
  }

  /**
   * Build hierarchical structure from flat nodes
   */
  private buildHierarchy(nodes: MindMapNode[]): MindMapNode[] {
    const sortedNodes = nodes.sort((a, b) => a.depth - b.depth);
    const rootNodes: MindMapNode[] = [];
    const nodeMap = new Map<string, MindMapNode>();

    sortedNodes.forEach(node => {
      nodeMap.set(node.id, node);
      
      if (node.depth === 0) {
        rootNodes.push(node);
      } else {
        // Find parent node (closest node with lower depth)
        const parentNode = this.findParentNode(node, sortedNodes);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }

  /**
   * Find parent node for hierarchical structure
   */
  private findParentNode(node: MindMapNode, allNodes: MindMapNode[]): MindMapNode | null {
    for (let i = allNodes.length - 1; i >= 0; i--) {
      const candidate = allNodes[i];
      if (candidate.depth < node.depth && candidate.depth >= node.depth - 1) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Generate insights using Chrome AI APIs or fallback to client-side analysis
   */
  private async generateInsights(mindMapData: MindMapNode[]): Promise<InsightData> {
    try {
      // Try Chrome AI API first
      if (await this.isChromeAIAvailable()) {
        return await this.generateInsightsWithChromeAI(mindMapData);
      }
    } catch (error) {
      console.log('Chrome AI not available, falling back to client-side analysis');
    }

    // Fallback to client-side NLP
    return this.generateInsightsClientSide(mindMapData);
  }

  /**
   * Check if Chrome AI APIs are available
   */
  private async isChromeAIAvailable(): Promise<boolean> {
    try {
      // @ts-expect-error - Chrome AI API is experimental
      return typeof (window as any).ai !== 'undefined' && 
             typeof (window as any).ai.languageModel !== 'undefined' &&
             (await (window as any).ai.languageModel.capabilities()).available === 'readily';
    } catch {
      return false;
    }
  }

  /**
   * Generate insights using Chrome AI API
   */
  private async generateInsightsWithChromeAI(mindMapData: MindMapNode[]): Promise<InsightData> {
    try {
      // @ts-expect-error - Chrome AI API is experimental
      const session = await (window as any).ai.languageModel.create({
        temperature: 0.7,
        topK: 3,
      });

      const mindMapText = this.formatMindMapForAnalysis(mindMapData);
      const prompt = `Analyze this mind map and provide insights:

${mindMapText}

Please provide:
1. Main branches (top-level themes)
2. Suggested connections between topics
3. Missing topics that could enhance the map
4. A brief summary

Format as JSON with keys: mainBranches, suggestedConnections, missingTopics, summary`;

      const response = await session.prompt(prompt);
      const result = JSON.parse(response);
      
      session.destroy();
      
      return {
        mainBranches: result.mainBranches || [],
        suggestedConnections: result.suggestedConnections || [],
        missingTopics: result.missingTopics || [],
        summary: result.summary || 'Analysis completed successfully.'
      };
    } catch (error) {
      console.error('Chrome AI analysis failed:', error);
      return this.generateInsightsClientSide(mindMapData);
    }
  }

  /**
   * Generate insights using client-side analysis
   */
  private generateInsightsClientSide(mindMapData: MindMapNode[]): InsightData {
    const allTexts = this.extractAllTexts(mindMapData);
    const keywords = this.extractKeywords(allTexts);
    
    return {
      mainBranches: this.identifyMainBranches(mindMapData),
      suggestedConnections: this.suggestConnections(mindMapData, keywords),
      missingTopics: this.suggestMissingTopics(keywords),
      summary: this.generateSummary(mindMapData, keywords)
    };
  }

  /**
   * Extract all text content from mind map
   */
  private extractAllTexts(nodes: MindMapNode[]): string[] {
    const texts: string[] = [];
    
    const traverse = (node: MindMapNode) => {
      texts.push(node.text);
      node.children.forEach(traverse);
    };
    
    nodes.forEach(traverse);
    return texts;
  }

  /**
   * Extract keywords using simple NLP
   */
  private extractKeywords(texts: string[]): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those']);
    
    const wordCounts = new Map<string, number>();
    
    texts.forEach(text => {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
      
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Identify main branches from root nodes
   */
  private identifyMainBranches(nodes: MindMapNode[]): string[] {
    return nodes
      .filter(node => node.depth <= 1)
      .map(node => node.text)
      .slice(0, 8);
  }

  /**
   * Suggest connections between topics
   */
  private suggestConnections(nodes: MindMapNode[], keywords: string[]): Array<{from: string; to: string; reason: string}> {
    const connections: Array<{from: string; to: string; reason: string}> = [];
    const allTexts = this.extractAllTexts(nodes);
    
    for (let i = 0; i < allTexts.length; i++) {
      for (let j = i + 1; j < allTexts.length; j++) {
        const text1 = allTexts[i];
        const text2 = allTexts[j];
        
        // Find common keywords
        const commonKeywords = this.findCommonKeywords(text1, text2, keywords);
        
        if (commonKeywords.length > 0) {
          connections.push({
            from: text1,
            to: text2,
            reason: `Share common concepts: ${commonKeywords.join(', ')}`
          });
        }
      }
    }
    
    return connections.slice(0, 5);
  }

  /**
   * Find common keywords between two texts
   */
  private findCommonKeywords(text1: string, text2: string, keywords: string[]): string[] {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    return keywords.filter(keyword => words1.has(keyword) && words2.has(keyword));
  }

  /**
   * Suggest missing topics
   */
  private suggestMissingTopics(keywords: string[]): string[] {
    const topicSuggestions = [
      'Implementation challenges',
      'Best practices',
      'Future considerations',
      'Related technologies',
      'Common pitfalls',
      'Success metrics',
      'Timeline considerations',
      'Resource requirements'
    ];
    
    // Filter out suggestions that might already be covered
    const existingKeywords = new Set(keywords);
    return topicSuggestions.filter(suggestion => 
      !existingKeywords.has(suggestion.toLowerCase().split(' ')[0])
    ).slice(0, 4);
  }

  /**
   * Generate summary
   */
  private generateSummary(nodes: MindMapNode[], keywords: string[]): string {
    const totalNodes = this.extractAllTexts(nodes).length;
    const mainBranches = this.identifyMainBranches(nodes);
    
    return `This mind map contains ${totalNodes} nodes across ${mainBranches.length} main branches. Key themes include: ${keywords.slice(0, 3).join(', ')}. The map covers ${mainBranches.length} primary topics with varying levels of detail.`;
  }

  /**
   * Format mind map for AI analysis
   */
  private formatMindMapForAnalysis(nodes: MindMapNode[]): string {
    let formatted = '';
    
    const traverse = (node: MindMapNode, indent: string = '') => {
      formatted += `${indent}- ${node.text}\n`;
      node.children.forEach(child => traverse(child, indent + '  '));
    };
    
    nodes.forEach(node => traverse(node));
    return formatted;
  }

  /**
   * Generate hash for data change detection
   */
  private generateDataHash(data: MindMapNode[]): string {
    const texts = this.extractAllTexts(data);
    return btoa(texts.join('|')).substring(0, 16);
  }

  /**
   * Fallback insights when analysis fails
   */
  private getFallbackInsights(): InsightData {
    return {
      mainBranches: ['Analysis unavailable'],
      suggestedConnections: [],
      missingTopics: ['Additional analysis needed'],
      summary: 'Unable to perform detailed analysis. Please try again.'
    };
  }
}