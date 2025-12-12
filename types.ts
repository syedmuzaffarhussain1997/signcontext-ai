export interface SignDetection {
  timestamp: string;
  gesture: string;
  meaning: string;
  confidence: number; // 0-1
}

export interface TranscriptSegment {
  timestamp: string;
  speaker: string;
  text: string;
}

export interface ContextAnalysis {
  environment: string;
  tone: string;
  nuances: string[]; // e.g., "Sarcastic", "Urgent"
  culturalNotes: string;
  reasoning: string; // The "Reasoning explanation"
}

export interface AnalysisResult {
  signs: SignDetection[];
  transcript: TranscriptSegment[];
  context: ContextAnalysis;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}