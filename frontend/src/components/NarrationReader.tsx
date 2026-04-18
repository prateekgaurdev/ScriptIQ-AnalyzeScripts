import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NarrationReaderProps {
  text: string;
}

export default function NarrationReader({ text }: NarrationReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentRange, setCurrentRange] = useState({ start: 0, end: 0 });
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const words = useRef<string[]>([]);
  const wordOffsets = useRef<{ start: number; end: number }[]>([]);

  useEffect(() => {
    // Prepare words and their character offsets
    const w = text.split(/(\s+)/); // Keep whitespace to maintain correct offsets
    let offset = 0;
    const processedWords = [];
    const processedOffsets = [];

    for (const part of w) {
      if (/\S/.test(part)) {
        processedWords.push(part);
        processedOffsets.push({ start: offset, end: offset + part.length });
      }
      offset += part.length;
    }

    words.current = processedWords;
    wordOffsets.current = processedOffsets;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [text]);

  const handlePlay = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const charIndex = event.charIndex;
        // Find which word this belongs to
        const index = wordOffsets.current.findIndex(
          (offset) => charIndex >= offset.start && charIndex < offset.end
        );
        if (index !== -1) {
          setCurrentWordIndex(index);
          setCurrentRange(wordOffsets.current[index]);
        }
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentWordIndex(-1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 backdrop-blur-sm sticky top-0 z-10">
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePlay}
            className="rounded-full bg-accent/10 hover:bg-accent/20 text-accent transition-all duration-300"
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleReset} className="rounded-full hover:bg-secondary">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 ml-auto px-3 border-l border-border">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] font-mono-data text-muted-foreground uppercase tracking-wider">Local Narrative Engine</span>
        </div>
      </div>

      <div className="prose prose-sm max-w-none leading-relaxed text-foreground text-opacity-90">
        {text.split("").map((char, i) => {
          const isHighlighted = i >= currentRange.start && i < currentRange.end;
          return (
            <span 
              key={i} 
              className={`transition-colors duration-200 ${isHighlighted ? "bg-accent/20 text-accent font-medium rounded-sm px-0.5 -mx-0.5" : ""}`}
            >
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
}
