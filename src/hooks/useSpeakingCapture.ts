import { useCallback, useEffect, useRef, useState } from 'react';
import { SPEECH_LANGUAGE } from '../constants/app';
import { deleteAudioClip, loadAudioClip, saveAudioClip } from '../lib/persistence';
import type { BrowserSpeechRecognition, CaptureStatus, SpeechWindow } from '../types/speech';

const AUDIO_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'] as const;
const RECOGNITION_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access or speech recognition was blocked. Check your browser permissions.',
  'audio-capture': 'No microphone was found. You can still write your answer below.',
  'no-speech': 'No speech was recognised. Try again or edit the transcript below.',
  network: 'Speech recognition could not connect. Your recording is still saved locally.',
  'language-not-supported': 'English speech recognition is not available in this browser.',
};

function getRecognitionConstructor() {
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function getRecordingType() {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return AUDIO_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));
}

export function useSpeakingCapture({
  captureId,
  allowOnlineRecognition,
  onTranscript,
}: {
  captureId: string;
  allowOnlineRecognition: boolean;
  onTranscript: (value: string) => void;
}) {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [recognitionMessage, setRecognitionMessage] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const activeRef = useRef(false);
  const objectUrlRef = useRef('');
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const replaceAudioUrl = useCallback((blob: Blob | null) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = blob ? URL.createObjectURL(blob) : '';
    setAudioUrl(objectUrlRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    replaceAudioUrl(null);
    setError('');
    loadAudioClip(captureId).then(blob => { if (!cancelled) replaceAudioUrl(blob); }).catch(() => {
      if (!cancelled) setError('Saved audio could not be loaded from this browser.');
    });
    return () => { cancelled = true; if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); };
  }, [captureId, replaceAudioUrl]);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
      setError('Audio recording is not supported here. Open this app in a current browser over HTTPS or localhost.');
      setStatus('error');
      return;
    }
    setStatus('checking'); setError(''); setRecognitionMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getRecordingType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setError('The audio recording stopped unexpectedly.'); setStatus('error'); };
      recorder.onstop = async () => {
        setStatus('saving');
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size) {
          try { await saveAudioClip(captureId, blob); replaceAudioUrl(blob); }
          catch { setError('Recording finished, but this browser could not save the audio locally.'); }
        }
        stream.getTracks().forEach(track => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        setStatus('idle');
      };

      const Recognition = getRecognitionConstructor();
      if (!Recognition) {
        setRecognitionMessage('Speech-to-text is not supported by this browser. You can type your answer below.');
      } else {
        const recognition = new Recognition();
        recognition.lang = SPEECH_LANGUAGE;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.onresult = event => {
          const words: string[] = [];
          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            if (result?.[0]?.transcript) words.push(result[0].transcript);
          }
          onTranscriptRef.current(words.join(' ').replace(/\s+([,.!?])/g, '$1').trim());
        };
        recognition.onerror = event => {
          setRecognitionMessage(RECOGNITION_ERROR_MESSAGES[event.error] ?? 'Speech recognition stopped. Your audio recording is kept.');
        };
        recognition.onend = () => { if (recognitionRef.current === recognition) recognitionRef.current = null; };
        recognitionRef.current = recognition;

        let localAvailable = false;
        if (Recognition.available) {
          try { localAvailable = await Recognition.available({ langs: [SPEECH_LANGUAGE], processLocally: true, quality: 'dictation' }) === 'available'; }
          catch { localAvailable = false; }
        }
        if (localAvailable) {
          recognition.processLocally = true;
          setRecognitionMessage('Transcribing on this device.');
        } else if (!allowOnlineRecognition) {
          recognitionRef.current = null;
          setRecognitionMessage('On-device English transcription is unavailable. Stop, allow online recognition and record again to transcribe speech.');
        } else {
          setRecognitionMessage('The browser may process this speech online.');
        }
        if (localAvailable || allowOnlineRecognition) {
          try { recognition.start(stream.getAudioTracks()[0]); }
          catch {
            try { recognition.start(); }
            catch { recognitionRef.current = null; setRecognitionMessage('Speech recognition could not start. Your audio recording is still active.'); }
          }
        }
      }
      activeRef.current = true;
      recorder.start();
      setStatus('recording');
    } catch (captureError) {
      const name = captureError instanceof DOMException ? captureError.name : '';
      setError(name === 'NotAllowedError' ? 'Microphone permission was denied. Allow microphone access and try again.' : 'Could not access the microphone. Check that it is connected and try again.');
      setStatus('error');
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [allowOnlineRecognition, captureId, onTranscript, replaceAudioUrl]);

  const stopRecording = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* Recognition may already have ended. */ }
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
    else {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStatus('idle');
    }
  }, []);

  const removeRecording = useCallback(async () => {
    try { await deleteAudioClip(captureId); replaceAudioUrl(null); }
    catch { setError('Could not remove the saved recording.'); }
  }, [captureId, replaceAudioUrl]);

  useEffect(() => () => {
    activeRef.current = false;
    try { recognitionRef.current?.abort(); } catch { /* Recognition may already have ended. */ }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    else streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  return { status, audioUrl, error, recognitionMessage, startRecording, stopRecording, removeRecording };
}
