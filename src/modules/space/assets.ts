// Uploaded space icons (PRD-06 §6.9, US-14): PNG, SVG, JPG or WebP, at most 1 MB, SVG sanitized
// before it is stored. Served only to members of the organization, with a CSP that blocks scripts.
import { getDb } from "@/db/client";
import type { AssetType } from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import type { RequestContext } from "@/lib/context";
import { appAccess } from "@/modules/authz/service";
import * as repo from "./repository";
import type { Fail } from "./shared";

export const MAX_ICON_BYTES = 1024 * 1024;

/** The real type from the first bytes; the declared type and extension are not trusted. */
export function sniff(bytes: Uint8Array): AssetType | "gif" | null {
  const b = bytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP") return "image/webp";
  if (b.length >= 6 && String.fromCharCode(...b.subarray(0, 4)) === "GIF8") return "gif";
  const head = new TextDecoder().decode(b.subarray(0, Math.min(b.length, 1024))).trimStart().toLowerCase();
  if (head.startsWith("<svg") || ((head.startsWith("<?xml") || head.startsWith("<!--")) && head.includes("<svg"))) return "image/svg+xml";
  return null;
}

/**
 * Removes what can run or load from an SVG: script and foreignObject elements, event handler
 * attributes, javascript:/data: links, external references, DOCTYPE/ENTITY declarations. The file is
 * also served with a script-blocking CSP and shown through <img>, so this is a second line.
 */
export function sanitizeSvg(svg: string): string | null {
  let s = svg;
  s = s.replace(/<!DOCTYPE[\s\S]*?(\[[\s\S]*?\])?\s*>/gi, "");
  s = s.replace(/<!ENTITY[\s\S]*?>/gi, "");
  s = s.replace(/<\?(?!xml\s)[\s\S]*?\?>/gi, "");
  for (const tag of ["script", "foreignObject", "iframe", "embed", "object", "audio", "video", "handler", "listener"]) {
    s = s.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "");
    s = s.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }
  s = s.replace(/\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/\s((?:xlink:)?href|src)\s*=\s*("\s*(?:javascript|data|vbscript|https?):[^"]*"|'\s*(?:javascript|data|vbscript|https?):[^']*'|(?:javascript|data|vbscript|https?):[^\s>]*)/gi, "");
  s = s.replace(/url\(\s*['"]?\s*(?:javascript|https?|data):[^)]*\)/gi, "none");
  s = s.replace(/@import[^;]*;?/gi, "");
  const lower = s.toLowerCase();
  if (!lower.includes("<svg") || /<script|javascript:|\son[a-z]+\s*=|<foreignobject/.test(lower)) return null;
  return s;
}

export type IconError = "TOO_LARGE" | "BAD_TYPE" | "NO_APP_ACCESS";

/** Stores an icon for a space dialog; the dialog then saves its id with the space (manage checked there). */
export async function uploadSpaceIcon(ctx: RequestContext, bytes: Uint8Array): Promise<{ ok: true; id: string } | Fail<IconError>> {
  if (bytes.length > MAX_ICON_BYTES) return { ok: false, code: "TOO_LARGE" };
  const db = getDb();
  if ((await appAccess(db, ctx, "space")) !== "ok") return { ok: false, code: "NO_APP_ACCESS" };
  const type = sniff(bytes);
  if (!type || type === "gif") return { ok: false, code: "BAD_TYPE" };
  let data = bytes;
  if (type === "image/svg+xml") {
    const clean = sanitizeSvg(new TextDecoder().decode(bytes));
    if (!clean) return { ok: false, code: "BAD_TYPE" };
    data = new TextEncoder().encode(clean);
  }
  if (!data.length) return { ok: false, code: "BAD_TYPE" };
  const id = uuidv7();
  await repo.insertAsset(db, { organizationId: ctx.organizationId, id, kind: "space_icon", contentType: type, bytes: data, size: data.length, createdBy: ctx.userId });
  return { ok: true, id };
}

/** For the asset route: the file, when the viewer is a member of its organization (checked by the caller). */
export async function readAsset(organizationId: string, id: string) {
  return repo.asset(getDb(), organizationId, id);
}
