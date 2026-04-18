import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useVoice } from "@/context/VoiceContext";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { speaker1Name, speaker2Name, setSpeaker1Name, setSpeaker2Name, renameSpeakers } = useVoice();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join("");
        
        // Immediate visual feedback (ghost transcript)
        // We don't call onTranscript yet to avoid duplicating text before diarization
        // But for "Real Time" feel, we could pass it to a temp state in parent
      };
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleTranscribe(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      if (recognitionRef.current) recognitionRef.current.start();
      setIsRecording(true);
      toast.info("Recording started. Speak clearly.");
    } catch (err) {
      console.error("Mic access error:", err);
      toast.error("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    try {
      const resp = await fetch("http://localhost:8000/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) throw new Error("Transcription failed");
      
      const data = await resp.json();
      // Apply renaming and pass to parent
      const cleanTranscript = renameSpeakers(data.transcript);
      onTranscript(cleanTranscript);
      toast.success("Transcript added to editor.");
    } catch (err) {
      console.error("Transcription error:", err);
      toast.error("Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isRecording ? "bg-destructive animate-pulse" : "bg-muted"}`} />
          <span className="text-xs font-mono-data uppercase tracking-wider text-muted-foreground">
            {isRecording ? "Listening..." : isTranscribing ? "Diarizing..." : "Voice Input"}
          </span>
        </div>
        <div className="flex gap-2">
          {!isRecording ? (
            <Button 
                variant="outline" 
                size="sm" 
                onClick={startRecording}
                disabled={isTranscribing}
                className="rounded-full gap-2 px-4"
            >
              <Mic className="h-4 w-4" /> Start Recording
            </Button>
          ) : (
            <Button 
                variant="destructive" 
                size="sm" 
                onClick={stopRecording}
                className="rounded-full gap-2 px-4 shadow-lg shadow-destructive/20"
            >
              <Square className="h-4 w-4" /> Stop & Add
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">User 1 Name</label>
          <input 
            type="text" 
            value={speaker1Name}
            onChange={(e) => setSpeaker1Name(e.target.value)}
            className="w-full bg-secondary/50 border-none rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-accent outline-none"
            placeholder="User 1"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">User 2 Name</label>
          <input 
            type="text" 
            value={speaker2Name}
            onChange={(e) => setSpeaker2Name(e.target.value)}
            className="w-full bg-secondary/50 border-none rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-accent outline-none"
            placeholder="User 2"
          />
        </div>
      </div>

      {isTranscribing && (
        <div className="flex items-center justify-center py-2 animate-fade-in">
          <Loader2 className="h-5 w-5 animate-spin text-accent mr-2" />
          <span className="text-xs text-muted-foreground italic">Gemini is identifying speakers...</span>
        </div>
      )}
    </div>
  );
}
