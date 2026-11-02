"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { PROFILE_LIMITS } from "@ken-os/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Skills as one flat list: type a skill and press Enter or a comma to add it, × to remove one, Backspace in the empty
// box to remove the last. Stored as one unnamed group, which the resume prints without a group label.

export function SkillEditor({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const skills = value.filter((skill) => skill.trim());
  const full = skills.length >= PROFILE_LIMITS.items;

  function add(text: string) {
    const fresh = text
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill && !skills.some((have) => have.toLowerCase() === skill.toLowerCase()));
    if (fresh.length) onChange([...skills, ...fresh].slice(0, PROFILE_LIMITS.items));
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && skills.length) {
      onChange(skills.slice(0, -1));
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Skills</Label>
      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {skills.map((skill, index) => (
            <li key={`${skill}-${index}`}>
              <Badge variant="secondary" className="h-7 gap-1 pr-0.5 pl-2.5 text-sm font-normal">
                {skill}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full"
                  aria-label={`Remove ${skill}`}
                  onClick={() => onChange(skills.filter((_, at) => at !== index))}
                >
                  <X />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        maxLength={PROFILE_LIMITS.text}
        placeholder={full ? `Up to ${PROFILE_LIMITS.items} skills` : "TypeScript"}
        disabled={full}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
      />
      <p className="text-xs text-muted-foreground">
        Enter or a comma adds a skill, {skills.length} of {PROFILE_LIMITS.items}
      </p>
    </div>
  );
}
