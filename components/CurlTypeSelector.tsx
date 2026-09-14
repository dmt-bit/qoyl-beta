import { Fragment } from "react";
import Image from "next/image";

// Extracted for reuse by ChildProfileForm (children's curl patterns follow
// the same 1a-4c taxonomy as adults) without touching app/profile/page.tsx's
// own copy of this selector - duplicated rather than imported from there to
// avoid any risk of regressing the already-working adult form.

export type CurlTypeOption = {
  value: string;
  label: string;
  group: string;
  type: string;
  descriptor: string;
  image: string;
};

export const CURL_TYPE_OPTIONS: CurlTypeOption[] = [
  {
    value: "1a",
    label: "1a",
    group: "Straight",
    type: "Straight",
    descriptor: "Very straight, fine and silky. No bend or wave at all.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-photo-35267456",
  },
  {
    value: "1b",
    label: "1b",
    group: "Straight",
    type: "Straight",
    descriptor: "Straight with slight body. Minimal bend at ends only.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-fall-maple-1195057-2325807",
  },
  {
    value: "1c",
    label: "1c",
    group: "Straight",
    type: "Straight",
    descriptor: "Straight but coarse or thick. Resistant to any curl.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-photo-3356211",
  },
  {
    value: "2a",
    label: "2a",
    group: "Wavy",
    type: "Wavy",
    descriptor: "Loose S-wave, fine texture. Slight wave through the length.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-ulrick-t-16207701",
  },
  {
    value: "2b",
    label: "2b",
    group: "Wavy",
    type: "Wavy",
    descriptor: "Defined S-wave, medium texture. Wave pattern throughout.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-aibek-skakov-418917601-27679976",
  },
  {
    value: "2c",
    label: "2c",
    group: "Wavy",
    type: "Wavy",
    descriptor: "Strong wave, coarser texture. Thick, frizz-prone waves.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-olga-somek-147015162-17889750",
  },
  {
    value: "3a",
    label: "3a",
    group: "Curly",
    type: "Curly",
    descriptor: "Loose spiral curls. Big, bouncy, defined ringlets.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-vlada-karpovich-4668513",
  },
  {
    value: "3b",
    label: "3b",
    group: "Curly",
    type: "Curly",
    descriptor: "Springy ringlets, medium-tight spiral. Lots of volume.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-soufianlafnesh-34579409",
  },
  {
    value: "3c",
    label: "3c",
    group: "Curly",
    type: "Curly",
    descriptor: "Tight corkscrew curls. Dense, voluminous, well-defined.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-eddson-lens-748406628-28172264",
  },
  {
    value: "4a",
    label: "4a",
    group: "Coily",
    type: "Coily",
    descriptor: "Defined S-coils. Tight but visible S-pattern when stretched.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-polina-tankilevitch-7382918",
  },
  {
    value: "4b",
    label: "4b",
    group: "Coily",
    type: "Coily",
    descriptor: "Z-pattern with sharp angles. Less definition, more shrinkage.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-jordy-toscano-712212447-27596675",
  },
  {
    value: "4c",
    label: "4c",
    group: "Coily",
    type: "Coily",
    descriptor: "Tightest coils, most shrinkage. Pattern less visible when dry.",
    image: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-praise-nnadozie-1081270006-38284790",
  },
];

export const CURL_TYPE_GROUPS = ["Straight", "Wavy", "Curly", "Coily"];

function CurlTypeCard({
  option,
  selected,
  onClick,
}: {
  option: CurlTypeOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col overflow-hidden rounded-xl text-left transition-colors ${
        selected ? "border-2 border-bronze" : "border border-[#e8e8e8]"
      }`}
    >
      <div className="relative aspect-[4/5] w-full shrink-0">
        <Image
          src={option.image}
          alt={`${option.label} ${option.type} curl pattern`}
          fill
          sizes="(min-width: 640px) 33vw, 50vw"
          className={`object-cover object-top ${selected ? "brightness-110" : ""}`}
        />
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-bronze">
            ✓
          </span>
        )}
      </div>
      <div className="bg-white px-2.5 py-2">
        <span className="block font-serif text-[18px] font-semibold text-dark">{option.label}</span>
        <span className="block font-sans text-[11px] text-bronze">{option.type}</span>
        <span className="mt-0.5 line-clamp-2 block font-sans text-[10px] leading-[1.4] text-muted">
          {option.descriptor}
        </span>
      </div>
    </button>
  );
}

function CurlGroupDivider({ label }: { label: string }) {
  return (
    <div className="col-span-2 mt-4 flex items-center gap-3 sm:col-span-3">
      <span className="h-px flex-1 bg-bronze/60" />
      <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.15em] text-bronze">{label}</span>
      <span className="h-px flex-1 bg-bronze/60" />
    </div>
  );
}

function NotSureCurlCard({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`col-span-2 flex flex-col items-center justify-center gap-1 rounded-xl bg-white px-4 py-6 text-center transition-colors sm:col-span-3 ${
        selected ? "border-2 border-bronze" : "border border-[#e8e8e8]"
      }`}
    >
      <span className="font-serif text-[32px] leading-none text-bronze">?</span>
      <span className="mt-1 font-serif text-[18px] font-semibold text-dark">Not sure yet</span>
      <span className="max-w-xs font-sans text-[10px] leading-[1.4] text-muted">
        We&apos;ll use your other answers to make our best recommendation.
      </span>
    </button>
  );
}

export default function CurlTypeSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {CURL_TYPE_GROUPS.map((group) => (
        <Fragment key={group}>
          <CurlGroupDivider label={group} />
          {CURL_TYPE_OPTIONS.filter((option) => option.group === group).map((option) => (
            <CurlTypeCard
              key={option.value}
              option={option}
              selected={value === option.value}
              onClick={() => onChange(option.value)}
            />
          ))}
        </Fragment>
      ))}
      <NotSureCurlCard selected={value === "not_sure"} onClick={() => onChange("not_sure")} />
    </div>
  );
}
