import { useRef, useState } from 'react';
import { petReply } from '../../services/petBrain';
import { useStore } from '../../store/store';

/** Shared send flow for the portrait chat and the landscape ship HUD. */
export function usePetChat() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // state updates are async: taps queued while the JS thread is busy all read a stale `busy`/`text`, so guard with a ref
  const sending = useRef(false);

  const send = async (suggestion?: string) => {
    const t = (suggestion ?? text).trim();
    if (!t || busy || sending.current) return;
    sending.current = true;
    setText('');
    setBusy(true);
    setError(null);
    useStore.getState().addChat({ from: 'me', text: t, ts: Date.now() });
    useStore.getState().careFor('talked');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<string>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('reply-timeout')), 30_000);
      });
      const reply = await Promise.race([petReply(t), deadline]);
      useStore.getState().addChat({ from: 'pet', text: reply, ts: Date.now() });
    } catch (e) {
      setError(e instanceof Error && e.message === 'reply-timeout'
        ? 'Orbi está tardando más de lo esperado. Tu mensaje sigue abajo para reintentarlo.'
        : 'Orbi no pudo responder. Tu mensaje sigue abajo para reintentarlo.');
      setText((draft) => draft || t);
    } finally {
      if (timeout) clearTimeout(timeout);
      sending.current = false;
      setBusy(false);
    }
  };

  return { text, setText, busy, error, send };
}
