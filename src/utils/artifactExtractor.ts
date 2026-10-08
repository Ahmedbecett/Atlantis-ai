import { Artifact } from '../types';

export function extractArtifacts(content: string): Artifact[] {
  const artifacts: Artifact[] = [];
  // Regex to match markdown code blocks ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\s*\n([\s\S]*?)```/g;
  let match;
  let count = 1;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const rawLang = (match[1] || 'text').toLowerCase().trim();
    const code = match[2].trim();

    let type: Artifact['type'] = 'markdown';
    let language = rawLang;

    if (['html', 'htm'].includes(rawLang)) {
      type = 'html';
      language = 'html';
    } else if (['jsx', 'tsx', 'react'].includes(rawLang)) {
      type = 'react';
      language = rawLang;
    } else if (['js', 'javascript'].includes(rawLang)) {
      type = 'javascript';
      language = 'javascript';
    } else if (['py', 'python'].includes(rawLang)) {
      type = 'python';
      language = 'python';
    } else if (['svg', 'xml'].includes(rawLang) && code.includes('<svg')) {
      type = 'svg';
      language = 'svg';
    } else if (['css'].includes(rawLang)) {
      type = 'css';
      language = 'css';
    } else if (['json'].includes(rawLang)) {
      type = 'json';
      language = 'json';
    }

    // Only make interactive artifacts for code that can be previewed or examined
    const isInteractive = ['html', 'react', 'javascript', 'svg', 'python'].includes(type) || code.length > 50;

    if (isInteractive) {
      let title = `تطبيق أتلانتس #${count} (${language.toUpperCase()})`;
      // Try to deduce title from code comments or HTML title
      const titleMatch = code.match(/<title>([^<]+)<\/title>/i) || code.match(/\/\/\s*title:\s*([^\n]+)/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }

      artifacts.push({
        id: `art-${Date.now()}-${count}`,
        title,
        type,
        code,
        language,
      });
      count++;
    }
  }

  return artifacts;
}
