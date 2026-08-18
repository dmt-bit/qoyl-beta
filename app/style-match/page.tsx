"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PostCard, { Post } from "@/components/PostCard";
import ShopButton from "@/components/ShopButton";
import { useAuth } from "@/lib/auth-context";
import { TIER_CLASSES, curlFamily, scoreTier } from "@/lib/compatibility";
import {
  StyleShoppingList,
  buildStyleShoppingList,
} from "@/lib/styleShoppingList";
import { lookupCityState } from "@/lib/zipLookup";

type DetectedStyle = {
  style_name: string;
  style_description: string;
  hair_length: string;
  requires_fake_hair: boolean;
  fake_hair_type: string | null;
  accessories_visible: string[];
  estimated_time: string;
  difficulty: string;
  compatible_hair_types: string[];
  maintenance_tips: string;
};

type YouTubeVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

type Stylist = {
  id: string;
  displayName: string;
  salonName: string | null;
  photoUrl: string | null;
  bookingUrl: string | null;
};

type PageState = "input" | "analyzing" | "confirm" | "results";
type ResultTab = "tutorials" | "shopping" | "stylist";

function CameraIcon() {
  return (
    <svg className="h-6 w-6 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.132.175C3.098 7.58 2.25 8.507 2.25 9.605v9.145c0 1.152.938 2.25 2.25 2.25h15c1.313 0 2.25-1.098 2.25-2.25V9.605c0-1.098-.848-2.026-1.803-2.2a41.03 41.03 0 00-1.132-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.235 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-6 w-6 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function AnalyzingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark/95 font-sans">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-3 w-3 animate-bounce rounded-full bg-bronze"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="mt-6 font-serif text-xl text-cream">Analyzing your style...</p>
      <p className="mt-2 text-sm text-cream/60">This takes about 10 seconds</p>
    </div>
  );
}

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ base64, mediaType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function StyleMatchContent() {
  const router = useRouter();
  const { user, loading: authLoading, hairProfile, hairProfileLoading } = useAuth();

  const resolvingAccess = authLoading || (Boolean(user) && hairProfileLoading);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    if (hairProfileLoading) return;
    if (!hairProfile) {
      router.replace("/profile");
    }
  }, [user, authLoading, hairProfile, hairProfileLoading, router]);

  const [pageState, setPageState] = useState<PageState>("input");
  const [error, setError] = useState<string | null>(null);

  // Input state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [textDescription, setTextDescription] = useState("");
  const [lastInputType, setLastInputType] = useState<"photo" | "text" | null>(null);

  const [detected, setDetected] = useState<DetectedStyle | null>(null);

  // Results state
  const [activeTab, setActiveTab] = useState<ResultTab>("tutorials");

  const [internalTutorials, setInternalTutorials] = useState<Post[]>([]);
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [tutorialsLoading, setTutorialsLoading] = useState(false);

  const [shoppingList, setShoppingList] = useState<StyleShoppingList | null>(null);
  const [shoppingLoading, setShoppingLoading] = useState(false);

  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [stylistsLoading, setStylistsLoading] = useState(false);

  // Completion (save + notify) fires on the first concluding action the
  // user takes -- saving the shopping list (DIY) or booking a stylist --
  // matching the spec's "Save this shopping list to my profile" button
  // being the thing that writes to style_matches, while still giving the
  // hey@qoyl.live notification a real DIY-vs-stylist answer to report.
  const completedRef = useRef(false);
  const [savingChoice, setSavingChoice] = useState<"diy" | "stylist" | null>(null);
  const [savedChoice, setSavedChoice] = useState<"diy" | "stylist" | null>(null);

  function resetToInput() {
    setPageState("input");
    setDetected(null);
    setError(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setTextDescription("");
    setActiveTab("tutorials");
    setInternalTutorials([]);
    setYoutubeVideos([]);
    setShoppingList(null);
    setStylists([]);
    completedRef.current = false;
    setSavedChoice(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function analyze(body: Record<string, unknown>, inputType: "photo" | "text") {
    setError(null);
    setPageState("analyzing");
    setLastInputType(inputType);

    try {
      const res = await fetch("/api/style-match/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Couldn't analyze this style. Please try again.");
        setPageState("input");
        return;
      }

      setDetected(data as DetectedStyle);
      setPageState("confirm");
    } catch {
      setError("Couldn't reach the style analysis service. Please try again.");
      setPageState("input");
    }
  }

  async function handleAnalyzePhoto() {
    if (!imageFile) return;
    const { base64, mediaType } = await fileToBase64(imageFile);
    analyze({ input_type: "photo", image_base64: base64, image_media_type: mediaType }, "photo");
  }

  function handleAnalyzeText() {
    if (!textDescription.trim()) return;
    analyze({ input_type: "text", text: textDescription }, "text");
  }

  // Loads all three results tabs' data once the user confirms the
  // detected style. Runs concurrently -- none of the three depend on
  // each other.
  useEffect(() => {
    if (pageState !== "results" || !detected || !hairProfile) return;

    let cancelled = false;
    const curlType = hairProfile.curl_type ?? "";

    async function loadTutorials() {
      setTutorialsLoading(true);
      try {
        // posts.hair_type stores a broad texture family (straight/wavy/
        // curly/coily/extensions/mens/baby/all -- see lib/postTabs.ts),
        // not a specific curl_type code like "4a", so the profile's
        // curl_type has to be bucketed into the same family first.
        const family = curlFamily(curlType);
        const postsParams = new URLSearchParams({ style_name: detected!.style_name });
        if (family) postsParams.set("hair_type_family", family);

        const [postsRes, ytRes] = await Promise.all([
          fetch(`/api/style-match/tutorials?${postsParams.toString()}`),
          fetch(
            `/api/style-match/youtube?${new URLSearchParams({
              style_name: detected!.style_name,
              curl_type: curlType,
            }).toString()}`
          ),
        ]);
        const postsData = await postsRes.json();
        const ytData = await ytRes.json();

        if (!cancelled) {
          setInternalTutorials(postsData.posts ?? []);
          setYoutubeVideos(ytData.videos ?? []);
        }
      } finally {
        if (!cancelled) setTutorialsLoading(false);
      }
    }

    async function loadShoppingList() {
      setShoppingLoading(true);
      try {
        const list = await buildStyleShoppingList({
          styleName: detected!.style_name,
          styleDescription: detected!.style_description,
          requiresFakeHair: detected!.requires_fake_hair,
          fakeHairType: detected!.fake_hair_type,
          accessoriesVisible: detected!.accessories_visible ?? [],
        });
        if (!cancelled) setShoppingList(list);
      } finally {
        if (!cancelled) setShoppingLoading(false);
      }
    }

    async function loadStylists() {
      setStylistsLoading(true);
      try {
        const cityState = await lookupCityState(hairProfile!.zip_code);
        if (!cityState) {
          if (!cancelled) setStylists([]);
          return;
        }

        const params = new URLSearchParams({ city: cityState.city, curl_type: curlType });
        const res = await fetch(`/api/style-match/stylists?${params.toString()}`);
        const data = await res.json();

        if (!cancelled) setStylists(data.stylists ?? []);
      } finally {
        if (!cancelled) setStylistsLoading(false);
      }
    }

    loadTutorials();
    loadShoppingList();
    loadStylists();

    return () => {
      cancelled = true;
    };
  }, [pageState, detected, hairProfile]);

  async function handleComplete(choice: "diy" | "stylist", stylistId: string | null) {
    if (!user || !detected || completedRef.current) return;
    completedRef.current = true;
    setSavingChoice(choice);

    try {
      const res = await fetch("/api/style-match/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          input_type: lastInputType,
          input_text: lastInputType === "text" ? textDescription : null,
          detected_style: detected.style_name,
          detected_details: detected,
          tutorials: { posts: internalTutorials.map((p) => p.slug), youtube: youtubeVideos },
          shopping_list: shoppingList,
          stylist_id: stylistId,
          choice,
        }),
      });
      if (res.ok) {
        setSavedChoice(choice);
      } else {
        completedRef.current = false;
      }
    } catch {
      completedRef.current = false;
    } finally {
      setSavingChoice(null);
    }
  }

  if (resolvingAccess || (user && !hairProfile)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading...</p>
      </main>
    );
  }

  if (pageState === "analyzing") return <AnalyzingOverlay />;

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-2xl">
        {pageState === "input" && (
          <>
            <h1 className="font-serif text-[28px] font-semibold text-cream">Style Match</h1>
            <p className="mt-2 text-sm text-cream/70">
              Upload a photo or describe a hairstyle you want, and we&apos;ll match it to
              tutorials, a shopping list scored for your hair, and a local stylist if one is
              available in your city.
            </p>

            {error && <p className="mt-4 text-sm text-red">{error}</p>}

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-bronze/30 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
                  <CameraIcon />
                </div>
                <p className="mt-4 font-serif text-xl font-semibold text-cream">Upload a photo</p>
                <p className="mt-1 text-sm text-cream/70">
                  Snap or upload a picture of the style you want.
                </p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handlePhotoChange}
                  className="mt-4 block w-full text-xs text-cream/70 file:mr-3 file:rounded-full file:border file:border-bronze/40 file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-bronze2"
                />

                {imagePreviewUrl && (
                  <div className="relative mt-3 h-40 w-full overflow-hidden rounded-lg bg-[#2C2420]">
                    <Image src={imagePreviewUrl} alt="Selected style" fill className="object-cover" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAnalyzePhoto}
                  disabled={!imageFile}
                  className="mt-4 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  Analyze this style →
                </button>
              </div>

              <div className="rounded-xl border border-bronze/30 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
                  <PencilIcon />
                </div>
                <p className="mt-4 font-serif text-xl font-semibold text-cream">Describe it</p>
                <p className="mt-1 text-sm text-cream/70">
                  Tell us about the hairstyle you&apos;re picturing.
                </p>

                <textarea
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="Knotless box braids, medium length, with a middle part..."
                  rows={4}
                  className="mt-4 w-full rounded-lg border border-bronze/40 bg-transparent px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleAnalyzeText}
                  disabled={!textDescription.trim()}
                  className="mt-4 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  Find this style →
                </button>
              </div>
            </div>
          </>
        )}

        {pageState === "confirm" && detected && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-cream">{detected.style_name}</h2>
            <p className="mt-2 text-sm text-cream/70">{detected.style_description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                {detected.hair_length} length
              </span>
              <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                {detected.difficulty}
              </span>
              <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                {detected.estimated_time}
              </span>
              {detected.requires_fake_hair && (
                <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                  {detected.fake_hair_type ?? "Fake hair needed"}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(detected.compatible_hair_types ?? []).map((t) => (
                <span key={t} className="rounded-full bg-dark px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-bronze">
                  {t}
                </span>
              ))}
            </div>

            {hairProfile?.curl_type &&
              (detected.compatible_hair_types ?? []).includes(hairProfile.curl_type) ? (
              <span className="mt-4 inline-block rounded-full bg-green/20 px-3 py-1 text-xs font-semibold text-green">
                Great match for your hair
              </span>
            ) : (
              <span className="mt-4 inline-block rounded-full bg-amber/20 px-3 py-1 text-xs font-semibold text-amber">
                May need modifications
              </span>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setPageState("results")}
                className="flex-1 rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
              >
                Yes, this is it →
              </button>
              <button
                type="button"
                onClick={resetToInput}
                className="flex-1 rounded-lg border border-bronze/40 py-3 text-sm font-semibold text-cream/80 transition-colors hover:border-bronze"
              >
                Not quite — try again
              </button>
            </div>
          </div>
        )}

        {pageState === "results" && detected && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-cream">{detected.style_name}</h2>
            <p className="mt-1 text-sm text-cream/60">{detected.maintenance_tips}</p>

            <div className="mt-6 flex gap-2 border-b border-bronze/20">
              {(["tutorials", "shopping", "stylist"] as ResultTab[])
                .filter((tab) => tab !== "stylist" || stylistsLoading || stylists.length > 0)
                .map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-bronze text-cream"
                        : "text-cream/50 hover:text-cream/80"
                    }`}
                  >
                    {tab === "tutorials" ? "Tutorials" : tab === "shopping" ? "Shopping List" : "Book a Stylist"}
                  </button>
                ))}
            </div>

            {activeTab === "tutorials" && (
              <div className="mt-6 space-y-8">
                {tutorialsLoading && <p className="text-sm text-cream/50">Loading tutorials...</p>}

                {!tutorialsLoading && internalTutorials.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
                      From Qoyl
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {internalTutorials.map((post) => (
                        <PostCard key={post.slug} post={post} compact />
                      ))}
                    </div>
                  </div>
                )}

                {!tutorialsLoading && youtubeVideos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
                      From YouTube
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {youtubeVideos.map((v) => (
                        <a
                          key={v.videoId}
                          href={`https://www.youtube.com/watch?v=${v.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col overflow-hidden rounded-xl border border-bronze/30 transition-colors hover:border-bronze"
                        >
                          <div className="relative h-28 w-full bg-[#2C2420]">
                            {v.thumbnailUrl && (
                              <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" />
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-1 p-4">
                            <p className="line-clamp-2 font-serif text-sm text-cream">{v.title}</p>
                            <p className="text-xs text-cream/50">{v.channelTitle}</p>
                            <span className="mt-1 text-xs text-bronze2">Watch on YouTube →</span>
                          </div>
                        </a>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] text-cream/40">
                      Videos from YouTube — not affiliated with Qoyl.
                    </p>
                  </div>
                )}

                {!tutorialsLoading && internalTutorials.length === 0 && youtubeVideos.length === 0 && (
                  <p className="text-sm text-cream/50">No tutorials found for this style yet.</p>
                )}
              </div>
            )}

            {activeTab === "shopping" && (
              <div className="mt-6 space-y-8">
                {shoppingLoading && <p className="text-sm text-cream/50">Building your shopping list...</p>}

                {!shoppingLoading && shoppingList && (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
                        Hair Care Products
                      </p>
                      <ul className="mt-3 space-y-2">
                        {shoppingList.hairCare.map((item) => (
                          <li key={item.catalogProductId} className="rounded-lg border border-bronze/30 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm text-cream">{item.name}</p>
                                <p className="text-xs text-cream/50">
                                  {item.brand} · {item.categoryLabel}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_CLASSES[scoreTier(item.score)]}`}>
                                {item.score}
                              </span>
                            </div>
                            <ShopButton productName={item.name} brandName={item.brand} className="mt-2 inline-block text-xs text-bronze2 underline" />
                          </li>
                        ))}
                        {shoppingList.hairCare.length === 0 && (
                          <p className="text-sm text-cream/50">No matching products found yet.</p>
                        )}
                      </ul>
                    </div>

                    {detected.requires_fake_hair && shoppingList.fakeHair.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
                          Fake Hair Needed
                        </p>
                        {shoppingList.fakeHairNote && (
                          <p className="mt-1 text-xs text-cream/50">{shoppingList.fakeHairNote}</p>
                        )}
                        <ul className="mt-3 space-y-2">
                          {shoppingList.fakeHair.map((item) => (
                            <li key={item.name} className="flex items-center justify-between rounded-lg border border-bronze/30 px-4 py-3">
                              <span className="text-sm text-cream">{item.name}</span>
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline">
                                {item.retailer} →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Tools</p>
                      <ul className="mt-3 space-y-2">
                        {shoppingList.tools.map((item) => (
                          <li key={item.name} className="flex items-center justify-between rounded-lg border border-bronze/30 px-4 py-3">
                            <span className="text-sm text-cream">{item.name}</span>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline">
                              {item.retailer} →
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {shoppingList.accessories.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Accessories</p>
                        <ul className="mt-3 space-y-2">
                          {shoppingList.accessories.map((item) => (
                            <li key={item.name} className="flex items-center justify-between rounded-lg border border-bronze/30 px-4 py-3">
                              <span className="text-sm text-cream">{item.name}</span>
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline">
                                {item.retailer} →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleComplete("diy", null)}
                      disabled={savingChoice === "diy" || savedChoice !== null}
                      className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-60"
                    >
                      {savedChoice
                        ? "Saved to your profile ✓"
                        : savingChoice === "diy"
                        ? "Saving..."
                        : "Save this shopping list to my profile →"}
                    </button>
                  </>
                )}
              </div>
            )}

            {activeTab === "stylist" && (
              <div className="mt-6 space-y-4">
                {stylistsLoading && <p className="text-sm text-cream/50">Finding stylists near you...</p>}

                {!stylistsLoading &&
                  stylists.map((stylist) => (
                    <div key={stylist.id} className="rounded-xl border border-bronze/30 p-5">
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#2C2420]">
                          {stylist.photoUrl && (
                            <Image src={stylist.photoUrl} alt={stylist.displayName} fill className="object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-serif text-lg text-cream">{stylist.displayName}</p>
                          {stylist.salonName && <p className="text-sm text-cream/60">{stylist.salonName}</p>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleComplete("stylist", stylist.id);
                          if (stylist.bookingUrl) {
                            window.open(stylist.bookingUrl, "_blank", "noopener,noreferrer");
                          }
                        }}
                        disabled={savingChoice === "stylist"}
                        className="mt-4 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-60"
                      >
                        {savedChoice === "stylist" ? "Booking request sent ✓" : "Book an appointment →"}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function StyleMatchPage() {
  return <StyleMatchContent />;
}
