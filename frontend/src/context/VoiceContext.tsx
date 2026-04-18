import React, { createContext, useContext, useState, useEffect } from "react";

interface VoiceContextType {
  speaker1Name: string;
  speaker2Name: string;
  setSpeaker1Name: (name: string) => void;
  setSpeaker2Name: (name: string) => void;
  renameSpeakers: (text: string) => string;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [speaker1Name, setSpeaker1Name] = useState(() => localStorage.getItem("speaker1Name") || "Writer 1");
  const [speaker2Name, setSpeaker2Name] = useState(() => localStorage.getItem("speaker2Name") || "Writer 2");

  useEffect(() => {
    localStorage.setItem("speaker1Name", speaker1Name);
  }, [speaker1Name]);

  useEffect(() => {
    localStorage.setItem("speaker2Name", speaker2Name);
  }, [speaker2Name]);

  const renameSpeakers = (text: string) => {
    let result = text;
    // Replace [Speaker 1] or Speaker 1: with current name
    result = result.replace(/\[?Speaker 1\]?:?/g, (match) => {
        return match.includes(":") ? `${speaker1Name}:` : speaker1Name;
    });
    result = result.replace(/\[?Speaker 2\]?:?/g, (match) => {
        return match.includes(":") ? `${speaker2Name}:` : speaker2Name;
    });
    return result;
  };

  return (
    <VoiceContext.Provider value={{ speaker1Name, speaker2Name, setSpeaker1Name, setSpeaker2Name, renameSpeakers }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error("useVoice must be used within a VoiceProvider");
  return context;
};
