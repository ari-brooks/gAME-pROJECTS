import React from 'react';

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  colorBlind: boolean;
}

interface Props {
  settings: GameSettings;
  onUpdate: (s: GameSettings) => void;
  onBack: () => void;
}

export default function SettingsScreen({ settings, onUpdate, onBack }: Props) {
  function set(patch: Partial<GameSettings>) {
    const next = { ...settings, ...patch };
    onUpdate(next);
    localStorage.setItem('echorun_settings', JSON.stringify(next));
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col w-full max-w-sm px-6 py-8 gap-6">
        <div className="flex items-center justify-between">
          <div className="font-mono text-2xl text-[#00ffff] tracking-widest"
            style={{ textShadow: '0 0 20px #00ffff' }}>
            SETTINGS
          </div>
          <button
            onClick={onBack}
            className="font-mono text-xs text-[#444] hover:text-[#00ffff] tracking-widest transition-colors duration-150 bg-transparent border-none"
          >
            &lt; BACK
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <ToggleRow
            label="MUTE ALL"
            value={settings.muted}
            onChange={v => set({ muted: v })}
          />

          <SliderRow
            label="MUSIC"
            value={settings.musicVolume}
            disabled={settings.muted}
            onChange={v => set({ musicVolume: v })}
          />

          <SliderRow
            label="SFX"
            value={settings.sfxVolume}
            disabled={settings.muted}
            onChange={v => set({ sfxVolume: v })}
          />

          <ToggleRow
            label="COLOR-BLIND MODE"
            value={settings.colorBlind}
            onChange={v => set({ colorBlind: v })}
          />

          <div className="border-t border-[#1a1a1a] pt-4">
            <div className="font-mono text-xs text-[#333] tracking-widest mb-3">CONTROLS</div>
            <div className="flex flex-col gap-1 font-mono text-xs text-[#555]">
              <ControlRow left="MOVE" right="A / D  or  ←→" />
              <ControlRow left="JUMP" right="SPACE or ↑" />
              <ControlRow left="DOUBLE JUMP" right="SPACE (in air)" />
              <ControlRow left="PULSE" right="R (after upgrade)" />
              <ControlRow left="NAVIGATE MENU" right="↑↓  ENTER" />
            </div>
          </div>
        </div>

        <div className="font-mono text-xs text-[#222] tracking-widest text-center mt-2">
          ECHO RUN v1.0.0
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between font-mono text-xs tracking-widest">
        <span className={disabled ? 'text-[#333]' : 'text-[#555]'}>{label}</span>
        <span className={disabled ? 'text-[#222]' : 'text-[#888]'}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#00ffff] disabled:opacity-20"
      />
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs text-[#555] tracking-widest">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`font-mono text-xs tracking-widest px-4 py-2 border transition-all duration-150 bg-transparent ${
          value
            ? 'border-[#00ffff] text-[#00ffff]'
            : 'border-[#333] text-[#444] hover:border-[#555]'
        }`}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

function ControlRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#444]">{left}</span>
      <span className="text-[#333]">{right}</span>
    </div>
  );
}
