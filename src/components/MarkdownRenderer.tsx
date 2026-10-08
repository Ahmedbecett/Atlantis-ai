import React, { useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';
import { Artifact } from '../types';

interface MarkdownRendererProps {
  content: string;
  onOpenArtifact?: (artifact: Artifact) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onOpenArtifact,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parseBlocks = (text: string) => {
    const blocks: { type: 'text' | 'code'; content: string; language?: string }[] = [];
    const regex = /```([a-zA-Z0-9_\-+]*)\s*\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({
          type: 'text',
          content: text.substring(lastIndex, match.index),
        });
      }
      blocks.push({
        type: 'code',
        language: match[1].toLowerCase().trim() || 'code',
        content: match[2].trim(),
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      blocks.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }

    return blocks;
  };

  const blocks = parseBlocks(content);

  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg font-bold text-cyan-300 mt-4 mb-2">
            {formatInline(line.replace('### ', ''))}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl font-bold text-cyan-200 mt-5 mb-2 pb-1 border-b border-cyan-900/40">
            {formatInline(line.replace('## ', ''))}
          </h2>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-2xl font-black text-cyan-100 mt-6 mb-3">
            {formatInline(line.replace('# ', ''))}
          </h1>
        );
      }

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-slate-200 my-1 leading-relaxed">
            {formatInline(line.trim().substring(2))}
          </li>
        );
      }

      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex gap-2 items-start my-1 text-slate-200 leading-relaxed">
            <span className="font-bold text-cyan-400 select-none min-w-[1.2rem]">{numMatch[1]}.</span>
            <span>{formatInline(numMatch[2])}</span>
          </div>
        );
      }

      if (line.startsWith('> ')) {
        return (
          <blockquote
            key={idx}
            className="border-l-4 border-cyan-500 bg-cyan-950/20 px-4 py-2 my-2 text-slate-300 italic rounded-r"
          >
            {formatInline(line.replace('> ', ''))}
          </blockquote>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="my-1 text-slate-200 leading-relaxed">
          {formatInline(line)}
        </p>
      );
    });
  };

  const formatInline = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs mx-0.5"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-2 text-slate-200 text-sm md:text-base selection:bg-cyan-500/30">
      {blocks.map((block, idx) => {
        if (block.type === 'text') {
          return <div key={idx}>{renderFormattedText(block.content)}</div>;
        }

        const isWebCode = ['html', 'htm', 'react', 'jsx', 'tsx', 'js', 'javascript', 'svg'].includes(
          block.language || ''
        );

        return (
          <div
            key={idx}
            className="my-4 rounded-xl overflow-hidden border border-cyan-950/80 bg-[#090d16] shadow-xl group"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/60 inline-block"></span>
                <span className="uppercase text-cyan-400 font-semibold">{block.language}</span>
              </div>
              <div className="flex items-center gap-2">
                {isWebCode && onOpenArtifact && (
                  <button
                    onClick={() =>
                      onOpenArtifact({
                        id: `art-${idx}`,
                        title: `Atlantis Artifact (${(block.language || 'Code').toUpperCase()})`,
                        type: block.language === 'svg' ? 'svg' : 'html',
                        code: block.content,
                        language: block.language || 'html',
                      })
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all font-sans font-medium"
                    title="Run in Live Sandbox"
                  >
                    <Play className="w-3.5 h-3.5 fill-cyan-300" />
                    <span>Live Preview</span>
                  </button>
                )}
                <button
                  onClick={() => handleCopy(block.content, idx)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-all font-sans"
                  title="Copy Code"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 overflow-x-auto text-xs md:text-sm font-mono text-cyan-100/90 leading-relaxed max-h-[480px]">
              <pre className="tab-4 font-mono">{block.content}</pre>
            </div>
          </div>
        );
      })}
    </div>
  );
};
