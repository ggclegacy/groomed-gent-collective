'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
export function VoiceInput({ onText }: { onText: (text: string) => void }) {
  const [message, setMessage] = useState('');
  const recognition = useRef<{ stop: () => void } | null>(null);
  useEffect(() => () => recognition.current?.stop(), []);
  function start() {
    // Browser recognition is optional. It may use the browser vendor's speech service.
    const win = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Constructor) {
      setMessage(
        'Voice input is unavailable in this browser. You can type your response.',
      );
      return;
    }
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    const r = new Constructor();
    r.lang = 'en-US';
    r.interimResults = false;
    r.continuous = false;
    recognition.current = r;
    r.onresult = (e) => {
      onText(e.results[0][0].transcript);
      setMessage('Voice added. Review the text before sending.');
    };
    r.onerror = () =>
      setMessage(
        'Voice input stopped. Check microphone permission or type instead.',
      );
    r.onend = () => {
      recognition.current = null;
    };
    try {
      r.start();
      setMessage('Listening… tap again to stop.');
    } catch {
      recognition.current = null;
      setMessage('Microphone could not start.');
    }
  }
  return (
    <div className="pm-voice">
      <button type="button" className="text-link" onClick={start}>
        <Mic size={15} /> Use voice / stop
      </button>
      <small>Optional browser speech service. Review before sending.</small>
      <output aria-live="polite">{message}</output>
    </div>
  );
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: (e: {
    results: { [key: number]: { [key: number]: { transcript: string } } };
  }) => void;
  onerror: () => void;
  onend: () => void;
}
