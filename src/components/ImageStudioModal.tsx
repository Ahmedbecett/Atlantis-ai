import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Download,
  Image as ImageIcon,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Maximize2,
} from 'lucide-react';
import { UserQuota } from '../types';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: UserQuota;
  onConsumeImageCredit: () => boolean;
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  quota,
  onConsumeImageCredit,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<
    { id: string; url: string; prompt: string; timestamp: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const samplePrompts = [
    'A futuristic submerged city of Atlantis with bioluminescent cyan spires and aquatic vehicles, 8k cinematic.',
    'An advanced aquatic android reading a crystalline holographic tome underwater, atmospheric lighting.',
    'A hyper-detailed quantum oceanic portal opening to the cosmos with swirling turquoise water, photorealistic.',
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    const canGenerate = onConsumeImageCredit();
    if (!canGenerate) {
      setError('You have reached your daily image generation limit. Upgrade to Atlantis Pro for 100 images/day.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image.');
      }

      const newImg = {
        id: `img-${Date.now()}`,
        url: data.imageUrl,
        prompt,
        timestamp: Date.now(),
      };

      setGeneratedImages((prev) => [newImg, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Image generation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (url: string, imgPrompt: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlantis-ai-${Date.now()}.png`;
    link.click();
  };

  const handleCopyPrompt = (p: string, id: string) => {
    navigator.clipboard.writeText(p);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const remainingImages = Math.max(0, (quota.imageCreditsTotal || 3) - (quota.imageCreditsUsedToday || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#070e1e] border border-cyan-800/40 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Atlantis AI Image Studio</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                  Multimodal Vision
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Remaining today: {remainingImages} of {quota.imageCreditsTotal || 3} images
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6">
          {/* Prompt Input Box */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Image Description (Prompt):
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your scene, atmosphere, lighting, artistic style, and color palette..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#0a1224] border border-cyan-950 focus:border-cyan-500 focus:outline-none text-sm text-slate-100 placeholder-slate-500 resize-none transition-all shadow-inner"
            />

            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-400 py-1">Inspirations:</span>
              {samplePrompts.map((sp, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(sp)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-800 text-[11px] truncate max-w-[280px] transition-colors"
                >
                  {sp}
                </button>
              ))}
            </div>

            {/* Controls: Aspect Ratio & Generate Button */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Aspect Ratio:</span>
                <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
                  {(['1:1', '16:9', '9:16', '4:3'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-3 py-1 rounded-md transition-all font-mono ${
                        aspectRatio === ratio
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim() || remainingImages <= 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Generating Artwork...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>Generate Image</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Gallery of Generated Images */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-300">Session Gallery:</h3>

            {generatedImages.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/30 border border-slate-800/50 text-slate-500 text-xs">
                No generated images in this session yet. Type a prompt above to create!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {generatedImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl overflow-hidden bg-slate-900 border border-cyan-950 hover:border-cyan-700/60 transition-all shadow-lg"
                  >
                    <img
                      src={img.url}
                      alt={img.prompt}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => setSelectedImage(img.url)}
                    />
                    <div className="p-2.5 bg-[#0a1224] text-xs space-y-1.5">
                      <p className="text-slate-300 truncate text-[11px]" title={img.prompt}>
                        {img.prompt}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <button
                          onClick={() => handleCopyPrompt(img.prompt, img.id)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300"
                        >
                          {copiedId === img.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy Prompt</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedImage(img.url)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                            title="Maximize"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownload(img.url, img.prompt)}
                            className="p-1 rounded text-cyan-400 hover:text-cyan-300"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zoomed Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={selectedImage}
                alt="Enlarged"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
