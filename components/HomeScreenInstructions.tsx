"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QOYL_URL, type HomeScreenPlatform } from "@/lib/homeScreen";

// The three-step "add to home screen" instructions for each platform.
// Used by the profile step and the home page banner's modal.

type Step = { icon: React.ReactNode; title: string; sub: string };

// iOS share arrow: a box with an arrow leaving the top.
function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M8 9H6v11h12V9h-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3v12M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return <span className="text-[20px] leading-none" aria-hidden="true">+</span>;
}

function CheckIcon() {
  return <span className="text-[18px] leading-none" aria-hidden="true">✓</span>;
}

function MenuIcon() {
  return <span className="text-[18px] leading-none tracking-[0.1em]" aria-hidden="true">⋮</span>;
}

const IOS_STEPS: Step[] = [
  { icon: <ShareIcon />, title: "tap the share button", sub: "the box with an arrow at the bottom of your screen" },
  { icon: <PlusIcon />, title: "tap 'add to home screen'", sub: "scroll down in the share menu to find it" },
  { icon: <CheckIcon />, title: "tap 'add'", sub: "qoyl will appear on your home screen" },
];

const ANDROID_STEPS: Step[] = [
  { icon: <MenuIcon />, title: "tap the menu", sub: "three dots in the top right of chrome" },
  { icon: <PlusIcon />, title: "tap 'add to home screen'", sub: "it's in the menu list" },
  { icon: <CheckIcon />, title: "tap 'add'", sub: "qoyl will appear on your home screen" },
];

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={step.title} className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-dark text-dark">
            {step.icon}
          </span>
          <div>
            <p className="font-sans text-[14px] font-medium lowercase text-dark">
              <span className="mr-1.5 font-mono text-[10px] text-muted">{i + 1}</span>
              {step.title}
            </p>
            <p className="mt-0.5 font-sans text-[13px] font-light leading-[1.65] text-[#666]">{step.sub}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function DesktopQr() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(QOYL_URL, { margin: 1, width: 180, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-sans text-[14px] font-medium lowercase text-dark">scan to open on your phone</p>
      <div className="mt-4 flex h-[180px] w-[180px] items-center justify-center border border-dark">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated data URL, not a remote image
          <img src={src} alt="qr code for qoyl.live" width={180} height={180} />
        ) : (
          <span className="font-mono text-[10px] text-muted">loading...</span>
        )}
      </div>
      <p className="mt-3 font-mono text-[10px] text-muted">qoyl.live</p>
    </div>
  );
}

export default function HomeScreenInstructions({ platform }: { platform: HomeScreenPlatform }) {
  if (platform === "desktop") return <DesktopQr />;
  return <StepList steps={platform === "ios" ? IOS_STEPS : ANDROID_STEPS} />;
}
