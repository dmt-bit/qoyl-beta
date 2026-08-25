// Shared building blocks for BabyProfileForm and ChildProfileForm - mirrors
// the visual language of app/profile/page.tsx's own SelectButton/Collapse
// pattern (bronze pills, font-serif bronze2 labels) without importing from
// that file, since its components aren't exported.

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-serif text-lg text-bronze2">{children}</p>;
}

export function FieldHelper({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm text-cream/60">{children}</p>;
}

export function SelectPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
        selected
          ? "border-bronze bg-bronze text-dark"
          : "border-bronze/40 bg-transparent text-cream hover:border-bronze"
      }`}
    >
      {label}
    </button>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
    />
  );
}

export function TextAreaInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
    />
  );
}

export function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <SelectPill label="Yes" selected={value === true} onClick={() => onChange(true)} />
      <SelectPill label="No" selected={value === false} onClick={() => onChange(false)} />
    </div>
  );
}

// The reassuring bronze intro callout (baby form header) and the warmer
// amber in-context notes (cradle cap, sensory sensitivities, heat tools
// etc.) are visually distinct on purpose - bronze for calm/reassuring
// framing, amber for "here's what we'll adjust because of your answer."
export function BronzeCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-bronze/40 bg-bronze/10 px-4 py-3 text-sm leading-relaxed text-cream/90">
      {children}
    </div>
  );
}

export function AmberCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-2 border-bronze bg-amber/10 px-4 py-3 text-sm leading-relaxed text-cream/90">
      {children}
    </div>
  );
}

// Baby texture cards: no real photography yet (spec calls for a neutral
// placeholder per card, with real Cloudinary photos to follow later), so
// this mirrors CurlTypeSelector's card shape/footer but with a plain
// gradient panel standing in for the (future) photo instead of an <Image>.
export function TextureCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col overflow-hidden rounded-xl text-left transition-colors ${
        selected ? "border-2 border-bronze" : "border border-[#2C2420]"
      }`}
    >
      <div
        className={`flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-[#2C2420] to-[#1C1612] ${
          selected ? "brightness-110" : ""
        }`}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          className="text-bronze/50"
        >
          <path strokeLinecap="round" d="M4 18c2-6 2-10 0-14M9 18c2-6 2-10 0-14M14 18c2-6 2-10 0-14M19 18c2-6 2-10 0-14" />
        </svg>
      </div>
      <div className="bg-dark px-2.5 py-2">
        <span className="block font-serif text-sm font-semibold text-bronze">{label}</span>
      </div>
    </button>
  );
}
