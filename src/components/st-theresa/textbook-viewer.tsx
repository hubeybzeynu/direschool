import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useServerFn } from "@tanstack/react-start";
import { askTextbook } from "@/lib/textbook-ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Copy, Download, Sparkles,
  Search, X, BookOpen, Dumbbell, Activity, FileQuestion, ZoomIn, ZoomOut, Send,
} from "lucide-react";
import { toast } from "sonner";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Use CDN worker matching the installed pdfjs-dist version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Item = { type: "unit" | "activity" | "exercise" | "review"; title: string; page: number };

const typeConfig = {
  unit:     { label: "Units", icon: BookOpen, color: "bg-purple-500" },
  exercise: { label: "Exercises", icon: Dumbbell, color: "bg-blue-500" },
  activity: { label: "Activities", icon: Activity, color: "bg-emerald-500" },
  review:   { label: "Reviews", icon: FileQuestion, color: "bg-amber-500" },
} as const;

export function TextbookViewer({ subject, url, onClose }: { subject: string; url: string; onClose: () => void }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1.0);
  const [pageTexts, setPageTexts] = useState<Record<number, string>>({});
  const [items, setItems] = useState<Item[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(800);

  // Selection popover
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);

  // Ask AI panel
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiSelection, setAiSelection] = useState<string>("");
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const ask = useServerFn(askTextbook);

  // Content finder
  const [finderOpen, setFinderOpen] = useState(false);

  useEffect(() => setPageInput(String(page)), [page]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.min(el.clientWidth - 24, 1200)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onDocLoad = useCallback((pdf: { numPages: number; getPage: (n: number) => Promise<any> }) => {
    setNumPages(pdf.numPages);
    // Extract text from every page in the background to power Ask AI + finder
    (async () => {
      const collected: Record<number, string> = {};
      const found: Item[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const p = await pdf.getPage(i);
          const tc = await p.getTextContent();
          const text = tc.items.map((it: any) => it.str).join(" ").replace(/\s+/g, " ");
          collected[i] = text;
          scanForItems(text, i, found);
        } catch { /* ignore */ }
      }
      setPageTexts(collected);
      // De-duplicate items by title+page
      const seen = new Set<string>();
      const dedup = found.filter(it => {
        const k = `${it.type}|${it.title.toLowerCase()}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setItems(dedup);
    })();
  }, []);

  const gotoPage = (n: number) => {
    const clamped = Math.max(1, Math.min(numPages || 1, Math.round(n)));
    setPage(clamped);
  };

  // Detect text selection inside the viewer
  useEffect(() => {
    const onUp = () => {
      const s = window.getSelection?.();
      const text = s?.toString().trim() ?? "";
      if (!text || text.length < 2) { setSel(null); return; }
      // Only react to selections inside the container
      if (!containerRef.current || !s || s.rangeCount === 0) return;
      const range = s.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) { setSel(null); return; }
      const rect = range.getBoundingClientRect();
      setSel({ text, x: rect.left + rect.width / 2, y: rect.top - 8 });
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-selection-menu]")) return;
      setSel(null);
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const contextForAi = useMemo(() => {
    const pages = [page - 1, page, page + 1].filter(p => p >= 1 && p <= numPages);
    return pages.map(p => `[Page ${p}] ${pageTexts[p] ?? ""}`).join("\n\n").slice(0, 22000);
  }, [pageTexts, page, numPages]);

  async function copySel() {
    if (!sel) return;
    await navigator.clipboard.writeText(sel.text);
    toast.success("Copied");
    setSel(null);
  }
  function askAboutSel() {
    if (!sel) return;
    setAiSelection(sel.text);
    setAiQuestion("Explain this to me simply.");
    setAiAnswer("");
    setAiOpen(true);
    setSel(null);
  }
  function openAiBlank() {
    setAiSelection("");
    setAiQuestion("");
    setAiAnswer("");
    setAiOpen(true);
  }
  async function submitAi() {
    if (!aiQuestion.trim() || aiLoading) return;
    setAiLoading(true); setAiAnswer("");
    try {
      const res = await ask({ data: {
        subject, currentPage: page,
        selection: aiSelection || null,
        context: contextForAi || null,
        question: aiQuestion.trim(),
      }});
      setAiAnswer(res.answer);
    } catch (e) {
      setAiAnswer("Failed to reach AI. Please try again.");
    } finally { setAiLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="h-14 flex items-center px-3 border-b gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="h-5 w-5"/></Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{subject}</p>
          <p className="text-[10px] text-muted-foreground">Grade 9 Textbook</p>
        </div>
        <div className="hidden sm:flex items-center gap-1 mr-2">
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.6, +(s - 0.15).toFixed(2)))}><ZoomOut className="h-4 w-4"/></Button>
          <span className="text-xs w-10 text-center tabular-nums">{Math.round(scale*100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2.4, +(s + 0.15).toFixed(2)))}><ZoomIn className="h-4 w-4"/></Button>
        </div>
        <a href={url} download className="p-2 rounded-lg hover:bg-muted" title="Download PDF"><Download className="h-4 w-4"/></a>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button>
      </div>

      {/* Page controls */}
      <div className="h-11 flex items-center justify-center gap-2 border-b bg-muted/30 shrink-0 text-sm">
        <Button variant="ghost" size="icon" onClick={() => gotoPage(page - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4"/></Button>
        <form onSubmit={e => { e.preventDefault(); gotoPage(parseInt(pageInput, 10) || 1); }} className="flex items-center gap-1">
          <Input value={pageInput} onChange={e => setPageInput(e.target.value.replace(/\D/g, ""))} className="h-8 w-16 text-center" />
          <span className="text-muted-foreground text-xs">/ {numPages || "…"}</span>
        </form>
        <Button variant="ghost" size="icon" onClick={() => gotoPage(page + 1)} disabled={!!numPages && page >= numPages}><ChevronRight className="h-4 w-4"/></Button>
      </div>

      {/* PDF area */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted flex justify-center">
        <Document
          file={url}
          onLoadSuccess={onDocLoad}
          loading={<p className="p-10 text-sm text-muted-foreground">Loading PDF…</p>}
          error={<p className="p-10 text-sm text-destructive">Failed to load PDF. Try downloading.</p>}
        >
          {numPages > 0 && (
            <Page
              pageNumber={page}
              width={width * scale}
              renderTextLayer
              renderAnnotationLayer={false}
            />
          )}
        </Document>
      </div>

      {/* Floating selection menu */}
      {sel && (
        <div
          data-selection-menu
          className="fixed z-[70] -translate-x-1/2 -translate-y-full bg-popover border rounded-lg shadow-lg flex overflow-hidden"
          style={{ left: sel.x, top: sel.y }}
          onMouseDown={e => e.preventDefault()}
        >
          <button onClick={copySel} className="px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-1.5"><Copy className="h-3.5 w-3.5"/>Copy</button>
          <button onClick={askAboutSel} className="px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-1.5 border-l"><Sparkles className="h-3.5 w-3.5 text-primary"/>Ask AI</button>
        </div>
      )}

      {/* Floating action buttons */}
      <button
        onClick={openAiBlank}
        className="fixed bottom-6 right-6 z-[60] h-12 px-4 rounded-full bg-primary text-primary-foreground flex items-center gap-2 shadow-lg hover:opacity-90"
      >
        <Sparkles className="h-5 w-5"/><span className="text-sm font-semibold">Ask AI</span>
      </button>
      <button
        onClick={() => setFinderOpen(true)}
        className="fixed bottom-6 right-40 z-[60] h-12 w-12 rounded-full bg-card border text-foreground flex items-center justify-center shadow-lg"
        title="Contents"
      >
        <Search className="h-5 w-5"/>
      </button>

      {/* Ask AI panel */}
      {aiOpen && (
        <AiPanel
          subject={subject}
          selection={aiSelection}
          question={aiQuestion}
          answer={aiAnswer}
          loading={aiLoading}
          contextReady={Object.keys(pageTexts).length > 0}
          onQuestion={setAiQuestion}
          onClearSelection={() => setAiSelection("")}
          onClose={() => setAiOpen(false)}
          onSubmit={submitAi}
        />
      )}

      {/* Content finder */}
      {finderOpen && (
        <ContentFinder
          subject={subject}
          items={items}
          ready={Object.keys(pageTexts).length > 0}
          onGo={(p) => { gotoPage(p); setFinderOpen(false); }}
          onClose={() => setFinderOpen(false)}
        />
      )}
    </div>
  );
}

function scanForItems(text: string, page: number, out: Item[]) {
  // Unit N
  for (const m of text.matchAll(/\bUnit\s+(\d{1,2})\b(?:\s*[:\-–]?\s*([A-Z][^\.]{2,80}))?/g)) {
    out.push({ type: "unit", title: m[2] ? `Unit ${m[1]}: ${m[2].trim()}` : `Unit ${m[1]}`, page });
  }
  // Unit Exercise / Review Exercise
  for (const _m of text.matchAll(/\b(Unit\s+Exercise|Review\s+Exercise)\b/gi)) {
    out.push({ type: "review", title: `${_m[1]}`, page });
  }
  // Activity N or N.M
  for (const m of text.matchAll(/\bActivity\s+(\d{1,2}(?:\.\d{1,2})?)\b/g)) {
    out.push({ type: "activity", title: `Activity ${m[1]}`, page });
  }
  // Exercise N or N.M
  for (const m of text.matchAll(/\bExercise\s+(\d{1,2}(?:\.\d{1,2})?)\b/g)) {
    out.push({ type: "exercise", title: `Exercise ${m[1]}`, page });
  }
  // Review
  for (const _m of text.matchAll(/\bReview\s+Questions?\b/gi)) {
    out.push({ type: "review", title: "Review Questions", page });
  }
}

function AiPanel(props: {
  subject: string; selection: string; question: string; answer: string;
  loading: boolean; contextReady: boolean;
  onQuestion: (v: string) => void; onClearSelection: () => void;
  onClose: () => void; onSubmit: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[65] bg-black/40" onClick={props.onClose}/>
      <div className="fixed right-0 top-0 bottom-0 z-[66] w-full sm:w-[440px] bg-background border-l flex flex-col">
        <div className="h-14 flex items-center px-4 border-b gap-2">
          <Sparkles className="h-5 w-5 text-primary"/>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Ask AI</p>
            <p className="text-[10px] text-muted-foreground truncate">{props.subject} • {props.contextReady ? "Reading textbook" : "Loading textbook…"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={props.onClose}><X className="h-4 w-4"/></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          {props.selection && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Selected text</p>
                <button onClick={props.onClearSelection} className="text-[10px] text-muted-foreground hover:text-foreground">clear</button>
              </div>
              <p className="text-xs italic line-clamp-6">"{props.selection}"</p>
            </div>
          )}
          {props.answer && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 whitespace-pre-wrap leading-relaxed">
              {props.answer}
            </div>
          )}
          {props.loading && (
            <div className="text-xs text-muted-foreground animate-pulse">Thinking…</div>
          )}
          {!props.answer && !props.loading && !props.selection && (
            <p className="text-xs text-muted-foreground">Ask anything about this textbook. The AI reads the page you're on and nearby pages for context.</p>
          )}
        </div>
        <form
          onSubmit={e => { e.preventDefault(); props.onSubmit(); }}
          className="border-t p-3 flex gap-2"
        >
          <Input
            autoFocus
            placeholder="Ask a question…"
            value={props.question}
            onChange={e => props.onQuestion(e.target.value)}
            disabled={props.loading}
          />
          <Button type="submit" disabled={props.loading || !props.question.trim()}>
            <Send className="h-4 w-4"/>
          </Button>
        </form>
      </div>
    </>
  );
}

function ContentFinder({ subject, items, ready, onGo, onClose }:
  { subject: string; items: Item[]; ready: boolean; onGo: (p: number) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all"|"unit"|"activity"|"exercise"|"review">("all");
  const filtered = items.filter(it =>
    (filter === "all" || it.type === filter) &&
    (!q || it.title.toLowerCase().includes(q.toLowerCase()))
  );
  const counts = {
    all: items.length,
    unit: items.filter(i => i.type === "unit").length,
    activity: items.filter(i => i.type === "activity").length,
    exercise: items.filter(i => i.type === "exercise").length,
    review: items.filter(i => i.type === "review").length,
  };
  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/40" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-card rounded-t-2xl border-t max-h-[75vh] flex flex-col">
        <div className="flex justify-center pt-2 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30"/></div>
        <div className="flex items-center justify-between px-4 pb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary"/>{subject} Contents ({items.length})</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4"/></Button>
        </div>
        {!ready && <p className="px-4 pb-2 text-xs text-muted-foreground">Scanning textbook… items will appear here.</p>}
        <div className="px-4 pb-2">
          <Input placeholder="Search units, activities, exercises…" value={q} onChange={e => setQ(e.target.value)}/>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {(["all","unit","activity","exercise","review"] as const).map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>
              {t === "all" ? `All (${counts.all})` : `${typeConfig[t].label} (${counts[t]})`}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">{ready ? "No matches" : "Loading…"}</p>
          ) : filtered.map((it, i) => {
            const cfg = typeConfig[it.type]; const Icon = cfg.icon;
            return (
              <button key={i} onClick={() => onGo(it.page)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted text-left">
                <div className={`w-9 h-9 rounded-lg ${cfg.color} flex items-center justify-center shrink-0`}><Icon className="w-4 h-4 text-white"/></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{it.type}</p>
                </div>
                <span className="text-xs text-primary font-mono shrink-0">p.{it.page}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}