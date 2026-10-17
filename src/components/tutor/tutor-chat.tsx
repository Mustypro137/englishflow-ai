"use client";

import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { suggestMemoriesAction } from "@/app/app/tutor/actions";
import { audioController } from "@/components/audio/audio-controller";
import { useAudioAvailability } from "@/components/audio/audio";
import { useHydrated } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form-controls";
import { TUTOR_MODE_INFO, TUTOR_MODES, type TutorModeName } from "@/lib/ai/modes";
import { cn } from "@/lib/utils/cn";
import { TutorMarkdown } from "./markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type ServerEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "text"; text: string }
  | { type: "done"; messageId: string }
  | { type: "error"; kind: string; message: string };

const MAX_LENGTH = 4000;

export interface ChatScenario {
  slug: string;
  partnerName: string;
  partnerVoice: "female" | "male";
  opening: string;
}

const NO_FILES = [{ key: "probe", text: "", voice: "female" as const, url: null }];

/** Plain text for reading a reply aloud: no Markdown symbols. */
function speakable(text: string): string {
  return text
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function TutorChat({
  conversation,
  initialMode,
  defaultStyle,
  lesson,
  scenario = null,
}: {
  conversation: { id: string; mode: TutorModeName; messages: ChatMessage[] } | null;
  initialMode: TutorModeName;
  defaultStyle: "concise" | "detailed";
  lesson: { slug: string; title: string } | null;
  /** Role-play: the mode is fixed and the partner's opening line is shown first. */
  scenario?: ChatScenario | null;
}) {
  const ids = useId();
  const hydrated = useHydrated();
  const [conversationId, setConversationId] = useState(conversation?.id ?? null);
  const [mode, setMode] = useState<TutorModeName>(conversation?.mode ?? initialMode);
  const [style, setStyle] = useState(defaultStyle);
  const [messages, setMessages] = useState<ChatMessage[]>(conversation?.messages ?? []);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState("");
  const [suggestion, setSuggestion] = useState<string>();
  const [suggesting, startSuggesting] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const busy = streaming !== null;
  const voice = useAudioAvailability(NO_FILES);
  const [readAloud, setReadAloud] = useState(false);
  useEffect(() => () => audioController().stop(), []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, streaming]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setError(undefined);
    setSuggestion(undefined);
    setStreaming("");
    setStatus("The tutor is writing…");
    const userMessage: ChatMessage = { id: `local-${Date.now()}`, role: "user", content: text };
    let res: Response;
    try {
      res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId,
          mode,
          message: text,
          style,
          lessonSlug: conversationId ? null : (lesson?.slug ?? null),
          scenarioSlug: conversationId ? null : (scenario?.slug ?? null),
        }),
      });
    } catch {
      setStreaming(null);
      setStatus("");
      setError("You seem to be offline. Your message wasn't sent.");
      return;
    }
    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setStreaming(null);
      setStatus("");
      setError(body?.error?.message ?? "The tutor is unavailable right now. Your lessons and reviews still work.");
      return;
    }
    setMessages((m) => [...m, userMessage]);
    setDraft("");

    let reply = "";
    let failed: string | undefined;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ServerEvent;
          if (event.type === "conversation") {
            if (!conversationId) {
              setConversationId(event.id);
              window.history.replaceState(null, "", `/app/tutor/${event.id}`);
            }
          } else if (event.type === "text") {
            reply += event.text;
            setStreaming(reply);
          } else if (event.type === "error") {
            failed = event.message;
          } else if (event.type === "done") {
            setMessages((m) => [...m, { id: event.messageId, role: "assistant", content: reply }]);
            if (readAloud && voice === "device") {
              void audioController().play(
                `reply-${event.messageId}`,
                [
                  {
                    key: event.messageId,
                    text: speakable(reply),
                    voice: scenario?.partnerVoice ?? "female",
                    url: null,
                  },
                ],
                "device",
              );
            }
          }
        }
      }
    } catch {
      failed = "The connection was interrupted before the reply finished.";
    }
    setStreaming(null);
    if (failed) {
      setError(`${failed} The unfinished reply wasn't saved.`);
      setStatus("The tutor's reply failed.");
    } else {
      setStatus("The tutor replied.");
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send();
  }

  function suggest() {
    if (!conversationId) return;
    startSuggesting(async () => {
      const res = await suggestMemoriesAction(conversationId);
      setSuggestion(
        res.ok
          ? res.added > 0
            ? `${res.added} ${res.added === 1 ? "suggestion" : "suggestions"} saved for you to check.`
            : "Nothing new to remember from this conversation."
          : res.error,
      );
    });
  }

  const info = TUTOR_MODE_INFO[mode];
  const hasExchange = messages.some((m) => m.role === "assistant");

  return (
    <div className="space-y-5">
      {scenario ? null : conversation ? (
        <p className="text-muted text-sm">
          Mode: <span className="text-ink font-medium">{info.label}</span>
        </p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`${ids}-mode`} className="text-ink text-sm font-semibold">
            Tutor mode
          </Label>
          <select
            id={`${ids}-mode`}
            value={mode}
            onChange={(e) => setMode(e.target.value as TutorModeName)}
            disabled={busy || messages.length > 0}
            aria-describedby={`${ids}-mode-desc`}
            className="border-border-strong bg-surface text-ink focus-visible:outline-primary block h-11 w-full rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 sm:max-w-sm"
          >
            {TUTOR_MODES.map((m) => (
              <option key={m} value={m}>
                {TUTOR_MODE_INFO[m].label}
              </option>
            ))}
          </select>
          <p id={`${ids}-mode-desc`} className="text-muted text-sm">
            {info.description}
          </p>
          {lesson ? (
            <p className="text-muted text-sm">
              About the lesson: <span className="text-ink font-medium">{lesson.title}</span>
            </p>
          ) : null}
        </div>
      )}

      {scenario && voice === "device" ? (
        <label className="text-ink flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={readAloud}
            onChange={(e) => {
              setReadAloud(e.target.checked);
              if (!e.target.checked) audioController().stop();
            }}
            className="accent-primary size-4"
          />
          Read {scenario.partnerName}&apos;s replies aloud (your device&apos;s computer voice)
        </label>
      ) : null}

      <ol aria-label="Conversation" className="space-y-4">
        {scenario ? <Message role="assistant" content={scenario.opening} name={scenario.partnerName} /> : null}
        {messages.map((m) => (
          <Message key={m.id} role={m.role} content={m.content} name={scenario ? scenario.partnerName : undefined} />
        ))}
        {streaming !== null ? (
          <Message role="assistant" content={streaming || "…"} live name={scenario?.partnerName} />
        ) : null}
      </ol>
      <div ref={endRef} />
      <p role="status" className="sr-only">
        {status}
      </p>

      {error ? (
        <Alert tone="danger" title="No reply">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={send} className="space-y-3" aria-label="Send a message to the tutor">
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-msg`} className="text-ink text-sm font-semibold">
            Your message
          </Label>
          <Textarea
            id={`${ids}-msg`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={scenario ? `Reply to ${scenario.partnerName}…` : info.placeholder}
            maxLength={MAX_LENGTH}
            rows={4}
            aria-describedby={`${ids}-msg-hint`}
          />
          <p id={`${ids}-msg-hint`} className="text-muted text-xs">
            Ctrl + Enter to send.{" "}
            {draft.length > MAX_LENGTH - 500 ? `${MAX_LENGTH - draft.length} characters left.` : ""}
          </p>
        </div>
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="text-muted float-left mr-2 text-sm">Explanations:</legend>
          {(["concise", "detailed"] as const).map((s) => (
            <label key={s} className="text-ink flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${ids}-style`}
                value={s}
                checked={style === s}
                onChange={() => setStyle(s)}
                className="accent-primary size-4"
              />
              {s === "concise" ? "Concise" : "Detailed"}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={!hydrated || busy || !draft.trim()}>
            {busy ? "Waiting for the tutor…" : "Send"}
          </Button>
          {conversationId && hasExchange ? (
            <Button type="button" variant="secondary" onClick={suggest} disabled={suggesting || busy}>
              {suggesting ? "Looking…" : "Suggest things to remember"}
            </Button>
          ) : null}
        </div>
        {suggestion ? (
          <p className="text-sm" role="status">
            {suggestion}{" "}
            <Link href="/app/settings/memory" className="text-primary font-medium underline">
              Review saved learning context
            </Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}

function Message({
  role,
  content,
  live = false,
  name,
}: {
  role: "user" | "assistant";
  content: string;
  live?: boolean;
  /** Who the assistant is playing, in role-play. */
  name?: string;
}) {
  return (
    <li
      className={cn(
        "rounded-lg border p-4 text-sm leading-relaxed",
        role === "user" ? "border-primary/30 bg-primary-soft ml-6 sm:ml-16" : "border-border bg-surface mr-6 sm:mr-16",
      )}
      aria-busy={live || undefined}
    >
      <p className="text-muted mb-1.5 text-xs font-semibold tracking-wide uppercase">
        {role === "user" ? "You" : (name ?? "Tutor")}
      </p>
      {role === "user" ? <p className="whitespace-pre-wrap">{content}</p> : <TutorMarkdown text={content} />}
    </li>
  );
}
