import React, { useState } from 'react';

interface Props {
  onComplete: (name: string) => void;
}

export default function NameEntryScreen({ onComplete }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError('Enter a name to begin.');
      return;
    }
    if (trimmed.length > 16) {
      setError('Max 16 characters.');
      return;
    }
    onComplete(trimmed);
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-6 px-8 py-10 border border-[#00ffff33] bg-[#0f0f0f] max-w-sm w-full"
        style={{ boxShadow: '0 0 40px rgba(0,255,255,0.08)' }}>
        <div className="text-[#00ffff] font-mono text-3xl tracking-widest" style={{ textShadow: '0 0 20px #00ffff' }}>
          ECHO RUN
        </div>
        <p className="text-[#888] font-mono text-sm text-center tracking-wide">
          IDENTIFY YOUR SIGNAL
        </p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            maxLength={16}
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            placeholder="ENTER CALLSIGN"
            className="w-full bg-transparent border border-[#00ffff44] text-[#00ffff] font-mono text-lg px-4 py-3 outline-none tracking-widest placeholder-[#334] text-center focus:border-[#00ffff]"
            style={{ transition: 'border-color 0.2s' }}
          />
          {error && (
            <p className="text-[#ff4444] font-mono text-xs text-center">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-transparent border border-[#00ffff] text-[#00ffff] font-mono text-base py-3 tracking-widest hover:bg-[#00ffff] hover:text-[#0a0a0a] transition-all duration-200"
            style={{ textShadow: 'none' }}
          >
            BEGIN
          </button>
        </form>
      </div>
    </div>
  );
}
