"use client";

import { useRef, useState } from "react";
import { Bold, ChevronDown, ChevronLeft, ChevronRight, Check, Code2, Ellipsis, Italic, Link2, List, ListOrdered, MessageCircle, PanelRightClose, PanelRightOpen, Pause, Play, Quote, Redo2, Settings2, Sparkles, Undo2, X } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";

const initialTitle = "What building Project Memory taught me about remembering decisions";
const initialBody = `<p>Early in building Project Memory, I kept losing the context behind our decisions. We had the what in issue threads and the how in code, but not the why. A few weeks later, I’d be rereading a thread and thinking, why did we choose this approach? The answer was usually buried in a teammate’s message or a document I couldn’t find.</p><p>We tried a few fixes: longer documentation, stricter templates, and a dedicated “decisions” folder. They helped, but they all required more discipline than we could sustain. The real shift came when we treated memory as a product surface, not a folder. We embedded decision notes where work already happens—right next to the artifact—and made them easy to capture, easy to find, and light weight to maintain.</p><p>The tradeoff was scope. We could have built a more structured knowledge graph early on, but that would have slowed us down. Instead, we chose a simpler approach: a consistent, minimal format that anyone on the team could use. It wasn’t perfect, but it was enough to change our habits—and that mattered more than elegance.</p><hr><h2>The choice that mattered</h2><p data-guidance="true" contenteditable="false">Describe the key decision, the options you considered, and why you chose the path you did.</p><p>Choosing simplicity over a full knowledge graph was the right call. It let us ship, get real usage, and learn what actually needed to be structured. In hindsight, the most valuable part wasn’t the system we built—it was the habit it created: writing down the why, while it’s still fresh.</p>`;

const outlines = ["A build story", "A shift in understanding", "An investigation", "A retrospective", "Blank page"];
const outlineGuidance: Record<string, string> = {
  "A build story": "Describe the key decision, the options you considered, and why you chose the path you did.",
  "A shift in understanding": "What did you believe before, and what changed your mind?",
  "An investigation": "What did you test, and which observation surprised you?",
  "A retrospective": "What happened, and what would you try differently next time?",
  "Blank page": "Write freely. You can add or ignore any structure.",
};
const toolbar = [
  { label: "Bold", icon: Bold, command: "bold" },
  { label: "Italic", icon: Italic, command: "italic" },
  { label: "Link", icon: Link2, command: "createLink" },
  { label: "Bulleted list", icon: List, command: "insertUnorderedList" },
  { label: "Numbered list", icon: ListOrdered, command: "insertOrderedList" },
  { label: "Quote", icon: Quote, command: "formatBlock", value: "blockquote" },
  { label: "Code", icon: Code2, command: "formatBlock", value: "pre" },
];

export function WritingStudioPreview() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState("");
  const [outline, setOutline] = useState(outlines[0]);
  const [wordCount, setWordCount] = useState(241);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [suggestionsPaused, setSuggestionsPaused] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(true);
  const [grammarOpen, setGrammarOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBody, setPreviewBody] = useState("");
  const [rawSaved, setRawSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [format, setFormat] = useState("p");

  function refreshCount(nextTitle = title) {
    const article = editorRef.current?.cloneNode(true) as HTMLElement | undefined;
    article?.querySelectorAll("[data-guidance]").forEach((element) => element.remove());
    const text = `${nextTitle} ${article?.textContent ?? ""}`.trim();
    setWordCount(text ? text.split(/\s+/).length : 0);
  }

  function applyFormat(command: string, value?: string) {
    editorRef.current?.focus();
    if (command === "createLink") {
      const url = window.prompt("Link URL (https://…)");
      if (!url || !/^https?:\/\//i.test(url)) return;
      document.execCommand(command, false, url);
    } else {
      document.execCommand(command, false, value);
    }
    refreshCount();
  }

  function handlePreviewAction(label: string) {
    setNotice(`${label} is a navigation concept in this design preview.`);
  }

  function changeOutline(next: string) {
    setOutline(next);
    const guidance = editorRef.current?.querySelector("[data-guidance]");
    if (guidance) guidance.textContent = outlineGuidance[next];
  }

  function acceptGrammar() {
    if (editorRef.current?.innerHTML.includes("light weight")) {
      editorRef.current.innerHTML = editorRef.current.innerHTML.replace("light weight", "lightweight");
      refreshCount();
    }
    setGrammarOpen(false);
    setNotice("Suggestion applied in this local preview.");
  }

  const headerActions = <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
    <span className="hidden text-xs text-muted-foreground xl:inline">Preview only · not saved</span>
    <label className="hidden items-center gap-1.5 rounded-lg bg-muted px-2.5 py-2 text-xs sm:flex">
      <span className="sr-only">Writing outline</span>
      <select className="max-w-32 cursor-pointer appearance-none bg-transparent outline-none" aria-label="Writing outline" value={outline} onChange={(event) => changeOutline(event.target.value)}>{outlines.map((item) => <option key={item}>{item}</option>)}</select>
      <ChevronDown size={13} aria-hidden="true" />
    </label>
    <Button className="hidden text-xs lg:inline-flex" size="sm" variant="ghost" type="button" onClick={() => setNotice("Choose a different outline above. Existing writing stays in place.")}><Settings2 size={15} /> Change outline</Button>
    <Button className="hidden text-xs md:inline-flex" size="sm" variant="outline" type="button" onClick={() => { setRawSaved(true); setNotice("Raw snapshot marked in this preview only. It is not stored or public."); }}>{rawSaved ? "Raw marked" : "Save raw draft"}</Button>
    <Button className="text-xs" size="sm" variant="outline" type="button" onClick={() => { setPreviewBody(editorRef.current?.innerText ?? ""); setPreviewOpen(true); }}>Preview</Button>
    <Button className="hidden text-xs sm:inline-flex" size="sm" type="button" onClick={() => setNotice("Publishing is not connected in this design preview.")}>Publish</Button>
    <Button aria-label={assistantOpen ? "Open or hide AI assistant" : "Show AI assistant"} className="inline-flex" size="icon-sm" variant="ghost" type="button" onClick={() => { if (window.innerWidth < 1024) { setAssistantOpen(true); requestAnimationFrame(() => document.getElementById("writing-assistant")?.scrollIntoView({ behavior: "smooth" })); } else setAssistantOpen((open) => !open); }}>{assistantOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}</Button>
    <Button aria-label="More preview actions" className="hidden sm:inline-flex" size="icon-sm" variant="ghost" type="button" onClick={() => setNotice("This is a design preview. No draft has been stored.")}><Ellipsis size={17} /></Button>
  </div>;

  return <WorkspaceShell email="preview@example.invalid" active="writing" preview headerActions={headerActions} onPreviewAction={handlePreviewAction}>
    {notice && <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/60 px-5 py-2 text-xs text-muted-foreground" role="status"><span>{notice}</span><button aria-label="Dismiss notice" type="button" onClick={() => setNotice("")}><X size={14} /></button></div>}
    <div className={`grid min-h-[calc(100vh-90px)] ${assistantOpen ? "lg:grid-cols-[minmax(0,1fr)_minmax(286px,32%)]" : "grid-cols-1"}`}>
      <section className="min-w-0 border-r border-border" aria-label="Post editor">
        <div className="sticky top-0 z-10 flex h-14 items-center gap-1 overflow-x-auto border-b border-border bg-background px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-7">
          <label className="mr-2 flex items-center gap-1.5 border-r border-border pr-3 text-xs text-muted-foreground">
            <span className="sr-only">Text style</span>
            <select className="cursor-pointer appearance-none bg-transparent outline-none" aria-label="Text style" value={format} onChange={(event) => { setFormat(event.target.value); applyFormat("formatBlock", event.target.value); }}><option value="p">Paragraph</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select><ChevronDown size={13} />
          </label>
          {toolbar.map(({ label, icon: Icon, command, value }, index) => <button className={`grid size-8 shrink-0 place-items-center rounded-md text-foreground hover:bg-muted ${index === 3 || index === 5 ? "ml-2 border-l border-border pl-2" : ""}`} key={label} type="button" title={label} aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat(command, value)}><Icon size={16} /></button>)}
          <span className="flex-1" />
          <button className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-muted" type="button" title="Undo" aria-label="Undo" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("undo")}><Undo2 size={16} /></button>
          <button className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-muted" type="button" title="Redo" aria-label="Redo" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("redo")}><Redo2 size={16} /></button>
          <button className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-muted" type="button" title="More formatting" aria-label="More formatting" onClick={() => setNotice("More formatting options are planned for the real editor.")}><Ellipsis size={17} /></button>
        </div>
        <div className="mx-auto w-full max-w-[780px] px-6 pb-24 pt-5 sm:px-10 lg:px-11">
          <textarea className="block w-full resize-none overflow-hidden border-0 bg-transparent font-display text-[clamp(2rem,3.1vw,3.3rem)] font-bold leading-[1.06] tracking-[-0.065em] outline-none placeholder:text-muted-foreground" aria-label="Post title" rows={3} value={title} onChange={(event) => { setTitle(event.target.value); refreshCount(event.target.value); }} />
          <input className="mt-1 w-full bg-transparent text-lg text-muted-foreground outline-none placeholder:text-muted-foreground" aria-label="Subtitle" placeholder="Add a subtitle (optional)" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
          <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground sm:hidden"><span>{outline}</span><span>·</span><button className="underline underline-offset-2" type="button" onClick={() => setNotice("Use the outline menu on a larger screen; the guidance never changes existing text.")}>Change outline</button></div>
          <div ref={editorRef} className="mt-5 min-h-[520px] outline-none [&_h2]:mb-1 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-[1.7rem] [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:tracking-[-0.04em] [&_hr]:my-5 [&_hr]:border-border [&_p]:mb-5 [&_p]:text-[16px] [&_p]:leading-[1.42] [&_p]:text-[#3b414a] [&_p[data-guidance]]:mb-4 [&_p[data-guidance]]:text-sm [&_p[data-guidance]]:text-muted-foreground [&_pre]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_blockquote]:border-l-2 [&_blockquote]:border-foreground [&_blockquote]:pl-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6" contentEditable suppressContentEditableWarning role="textbox" aria-label="Article body" aria-multiline="true" onInput={() => refreshCount()} dangerouslySetInnerHTML={{ __html: initialBody }} />
        </div>
      </section>
      {assistantOpen && <aside className="min-w-0 px-5 pb-12 pt-6 sm:px-7 lg:border-l-0" aria-label="Draft details and AI assistant" id="writing-assistant">
        <div className="border-b border-border pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-muted-foreground">Draft</p><p className="mt-1 text-xs text-muted-foreground">Local design preview · not saved</p></div>
        <div className="grid grid-cols-2 border-b border-border py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Words</p><p className="mt-1 text-sm text-muted-foreground">{wordCount}</p></div><div className="border-l border-border pl-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Read time</p><p className="mt-1 text-sm text-muted-foreground">~ {Math.max(1, Math.ceil(wordCount / 350))} min</p></div></div>
        <div className="border-b border-border py-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Slug</p><p className="mt-1 text-sm text-muted-foreground">Auto-generate on publish</p></div>
        <div className="flex items-center justify-between gap-2 pt-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">AI assistant</p><button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" type="button" onClick={() => setSuggestionsPaused((paused) => !paused)}>{suggestionsPaused ? <Play size={14} /> : <Pause size={14} />}{suggestionsPaused ? "Resume suggestions" : "Pause suggestions"}</button></div>
        {suggestionsPaused ? <p className="mt-5 rounded-lg border border-border p-4 text-sm text-muted-foreground">Suggestions are paused for this preview.</p> : <>
          {questionOpen && <div className="mt-5 rounded-lg border border-border bg-card p-4"><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"><Sparkles size={16} /> A thought to consider</span><button aria-label="Dismiss writing question" type="button" onClick={() => setQuestionOpen(false)}><X size={15} /></button></div><p className="mt-3 text-base leading-6 text-[#3b414a]">You might expand on what changed after you made this decision. How did it affect your team or your own workflow?</p><p className="mt-4 text-sm leading-6 text-muted-foreground">This can help the post feel more complete and reflective.</p></div>}
          <div className="mt-5 border-t border-border pt-5"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">In text&nbsp;&nbsp; {grammarOpen ? "1 suggestion" : "No suggestions"}</p>{grammarOpen && <div className="flex items-center gap-2 text-xs text-muted-foreground"><ChevronLeft size={15} /> 1 / 1 <ChevronRight size={15} /></div>}</div>
            {grammarOpen && <div className="mt-3 rounded-lg border border-border bg-card p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} /> Grammar</p><p className="mt-2 text-sm leading-5 text-[#3b414a]">Consider “lightweight” instead of “light weight”.</p><div className="mt-3 grid grid-cols-2 gap-2"><Button size="sm" type="button" onClick={acceptGrammar}><Check size={13} /> Accept</Button><Button size="sm" variant="outline" type="button" onClick={() => setGrammarOpen(false)}>Dismiss</Button></div><p className="mt-3 text-xs text-muted-foreground">Keeps compound modifier as one word.</p></div>}
          </div>
        </>}
        <button className="mt-8 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground lg:hidden" type="button" onClick={() => setAssistantOpen(false)}><PanelRightClose size={15} /> Hide assistant</button>
      </aside>}
    </div>
    {!assistantOpen && <button className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm shadow-lg" type="button" onClick={() => setAssistantOpen(true)}><MessageCircle size={17} /> Show assistant</button>}
    {previewOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="preview-title"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Design preview</p><h2 className="mt-2 font-display text-xl font-bold" id="preview-title">Article preview</h2></div><button aria-label="Close preview" type="button" onClick={() => setPreviewOpen(false)}><X size={19} /></button></div><h3 className="mt-6 font-display text-2xl font-bold leading-tight">{title || "Untitled post"}</h3>{subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}<p className="mt-4 text-sm text-muted-foreground">{wordCount} words · {outline}</p><p className="mt-5 whitespace-pre-line text-sm leading-6">{previewBody}</p><p className="mt-5 rounded-lg border border-border bg-muted/50 p-4 text-sm leading-6">This is a local layout preview. No draft has been saved, sent to an assistant, or published. {rawSaved ? "A raw snapshot is marked only in this browser session." : "No raw snapshot is marked."}</p><Button className="mt-5" variant="outline" type="button" onClick={() => setPreviewOpen(false)}>Back to writing</Button></div></div>}
  </WorkspaceShell>;
}
