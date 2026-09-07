"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  MAX_IMAGE_URL,
  fileToDataUrl,
  isDataUrl,
  isRemoteUrl,
} from "@/lib/imageFile";

/**
 * Two ways to set an image: paste a URL, or pick a file from the device.
 *
 * `value` is whatever will be sent as `image_url`. `null` means "remove the
 * picture" and is a different instruction from leaving the field untouched —
 * the API treats an omitted key as "leave it alone" (API.md gotcha 2), so the
 * form above decides which to send.
 */
export function ImagePicker({
  value,
  onChange,
  name,
  label = "Image",
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  /** For the initial in the fallback. */
  name: string;
  label?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [tooBig, setTooBig] = useState(false);

  // The URL box keeps its own text and only commits a complete URL upward.
  // Committing per keystroke would hand next/image "h", then "ht", … — each of
  // which is an invalid src, not just a slow-loading one.
  const [urlText, setUrlText] = useState(
    value && !isDataUrl(value) ? value : "",
  );

  // Follow the value when it changes from elsewhere (a file was picked, or the
  // form was reset).
  useEffect(() => {
    setUrlText(value && !isDataUrl(value) ? value : "");
  }, [value]);

  const commitUrl = () => {
    const trimmed = urlText.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    // Only a usable URL goes up; anything else stays local until it's finished
    // and the error below explains why nothing changed.
    if (isRemoteUrl(trimmed)) onChange(trimmed);
  };

  const urlLooksWrong = urlText.trim().length > 0 && !isRemoteUrl(urlText.trim());

  async function onPick(file: File) {
    setBusy(true);
    setTooBig(false);
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl) {
        setTooBig(true);
        return;
      }
      onChange(dataUrl);
    } catch {
      setTooBig(true);
    } finally {
      setBusy(false);
      // Let the same file be chosen again after a failure.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-fg">{label}</span>

      <div className="flex items-center gap-4">
        <Avatar src={value} name={name} size={64} />

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPick(file);
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {busy ? "Preparing…" : "Choose file"}
          </Button>
          {value && (
            <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>

      <Input
        label="Or paste an image URL"
        type="url"
        placeholder="https://…"
        value={urlText}
        onChange={(event) => setUrlText(event.target.value)}
        // Committed on blur, and on Enter for anyone who never leaves the field.
        onBlur={commitUrl}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitUrl();
          }
        }}
        error={
          tooBig
            ? "That picture is too large to store. Try a smaller one, or paste a URL instead."
            : urlLooksWrong
              ? "Needs to start with http:// or https://"
              : undefined
        }
        hint={
          value && isDataUrl(value)
            ? `Using the file you chose (${value.length} of ${MAX_IMAGE_URL} characters).`
            : // Worth saying out loud — it explains why device images look soft.
              "Files from your device are shrunk to fit the 2048-character limit the API stores."
        }
      />
    </div>
  );
}
