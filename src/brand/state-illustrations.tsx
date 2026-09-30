"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Agere state illustrations — extended set (universal + ledger + education + hiring).
 * Follows the rules of src/brand/illustrations.tsx:
 *  - line = fg-subtle · fill = bg-default · ground = bg-emphasis · accent = brand-accent / brand-accent-subtle
 *  - colors come ONLY from tokens → light/dark + data-brand white-labels work automatically
 * Differences from the core set: 320×220 artboard, and strokes are non-scaling (always 2px on screen).
 * Decorative by default (aria-hidden). Pass `title` to make one meaningful.
 * No text inside the artwork (DS rule: it won't translate) — v6.1 replaced "Halo!", "PRO", "404" and "Ditutup"
 * with language-neutral symbols. Titles, descriptions and actions belong to <EmptyState>, not the illustration.
 */
export interface StateIllustrationProps extends Omit<React.SVGAttributes<SVGSVGElement>, "children"> {
  size?: number;
  title?: string;
}

const L = "stroke-[hsl(var(--ag-fg-subtle))]";
const F0 = "fill-[hsl(var(--ag-bg-default))]";
const G = "fill-[hsl(var(--ag-bg-emphasis))]";
const FS = "fill-[hsl(var(--ag-fg-subtle))]";
const A = "fill-[hsl(var(--ag-brand-accent))]";
const AS = "fill-[hsl(var(--ag-brand-accent-subtle))]";
const AL = "stroke-[hsl(var(--ag-brand-accent))]";

function Frame({ size = 240, title, className, children, ...props }: StateIllustrationProps & { children: React.ReactNode }) {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 320 220"
      width={size}
      height={(size * 220) / 320}
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-labelledby={title ? id : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0 [&_*]:[vector-effect:non-scaling-stroke]", className)}
      {...props}
    >
      {title && <title id={id}>{title}</title>}
      {children}
    </svg>
  );
}

/** Onboarding: selamat datang */
export function StateIllustrationWelcome(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L, F0)} d="M122,200 C121,150 130,118 160,114 C190,118 199,150 198,200 Z" /><path className={cn(L)} d="M130,132 C120,160 122,180 128,196" /><path className={cn(L)} d="M190,130 C207,118 214,100 216,82" /><circle className={cn(L, F0)} cx="216" cy="75" r="8" /><path className={cn(L)} d="M226,60 q8,-2 12,-10 M230,76 q9,0 15,-4" /><g transform="translate(160,82) scale(0.8)"><circle className={cn(L, F0)} cx="0" cy="0" r="34" /><path className={cn(L, FS)} d="M-34,0 C-38,-38 -10,-50 10,-46 C34,-44 44,-22 34,-2 C26,-16 10,-22 -6,-18 C-18,-14 -28,-8 -34,0 Z" /><path className={cn(L)} d="M-14,5 q5,-4 10,0" /><path className={cn(L)} d="M6,5 q5,-4 10,0" /><path className={cn(L)} d="M1,10 l-3,8 l4,1" /><path className={cn(L)} d="M-8,24 q8,7 16,0" /></g><path className={cn(L, F0)} d="M42,58 L112,58 Q120,58 120,66 L120,90 Q120,98 112,98 L80,98 L68,110 L69,98 L50,98 Q42,98 42,90 L42,66 Q42,58 50,58 Z" /><circle className={cn(FS)} cx="64" cy="78" r="4" /><circle className={cn(FS)} cx="81" cy="78" r="4" /><circle className={cn(FS)} cx="98" cy="78" r="4" /><path className={cn(L)} d="M262,105 v14 M255,112 h14" /><rect className={cn(A)} x="265.5" y="37.5" width="9.0" height="9.0" rx="1.8" transform="rotate(45 270 42)" /><circle className={cn(G)} cx="40" cy="140" r="3" />
    </Frame>
  );
}

/** Empty state: pertama kali */
export function StateIllustrationEmpty(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L, F0)} d="M105,125 L80,100 L112,90 L125,105 Z" /><path className={cn(L, G)} d="M105,125 L125,105 L235,105 L215,125 Z" /><path className={cn(L, F0)} d="M215,125 L235,105 L262,118 L244,140 Z" /><rect className={cn(L, F0)} x="105" y="125" width="110" height="72" rx="2" /><path className={cn(L, F0)} d="M215,125 L235,105 L235,178 L215,197 Z" /><rect className={cn(L, AS)} x="133" y="148" width="54" height="22" rx="4" /><path className={cn(L)} strokeDasharray="2 8" d="M170,98 C168,86 172,80 170,76" /><circle className={cn(L, F0)} cx="170" cy="52" r="20" /><path className={cn(L)} d="M170,44 v16 M162,52 h16" /><rect className={cn(A)} x="245.95" y="51.95" width="8.1" height="8.1" rx="1.6" transform="rotate(45 250 56)" /><circle className={cn(G)} cx="70" cy="160" r="3" />
    </Frame>
  );
}

/** Permintaan izin akses */
export function StateIllustrationPermission(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="118" y="34" width="84" height="160" rx="14" /><line className={cn(L)} x1="148" y1="48" x2="172" y2="48" /><rect className={cn(L, AS)} x="148" y="82" width="24" height="40" rx="12" /><path className={cn(L)} d="M138,108 q22,30 44,0" /><line className={cn(L)} x1="160" y1="130" x2="160" y2="144" /><line className={cn(L)} x1="148" y1="146" x2="172" y2="146" /><line className={cn(L)} x1="138" y1="166" x2="182" y2="166" /><circle className={cn(L, F0)} cx="236" cy="72" r="18" /><path className={cn(L)} d="M228,72 l6,6 l10,-12" /><circle className={cn(L, F0)} cx="80" cy="96" r="16" /><path className={cn(L)} d="M74,91 q0,-7 6,-7 q6,0 6,6 q0,4 -6,7 v3" /><circle className={cn(G)} cx="80" cy="106" r="2.2" /><path className={cn(L)} d="M252,144 v12 M246,150 h12" />
    </Frame>
  );
}

/** Sukses / milestone */
export function StateIllustrationSuccess(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <circle className={cn(AS)} cx="160" cy="112" r="72" /><ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L)} d="M136,114 C122,98 116,80 110,60" /><circle className={cn(L, F0)} cx="108" cy="54" r="7" /><path className={cn(L)} d="M184,114 C198,98 204,80 210,60" /><circle className={cn(L, F0)} cx="212" cy="54" r="7" /><path className={cn(L)} d="M148,160 L136,188" /><path className={cn(L)} d="M172,160 L186,186" /><path className={cn(L, F0)} d="M132,166 C130,130 138,104 160,100 C182,104 190,130 188,166 Z" /><g transform="translate(160,72) scale(0.72)"><circle className={cn(L, F0)} cx="0" cy="0" r="34" /><path className={cn(L, FS)} d="M-34,0 C-38,-38 -10,-50 10,-46 C34,-44 44,-22 34,-2 C26,-16 10,-22 -6,-18 C-18,-14 -28,-8 -34,0 Z" /><path className={cn(L)} d="M-14,5 q5,-4 10,0" /><path className={cn(L)} d="M6,5 q5,-4 10,0" /><path className={cn(L)} d="M1,10 l-3,8 l4,1" /><path className={cn(L)} d="M-8,24 q8,7 16,0" /></g><rect className={cn(L, F0)} x="70" y="60" width="9" height="5" rx="1" transform="rotate(30 70 60)" /><rect className={cn(L, G)} x="248" y="48" width="9" height="5" rx="1" transform="rotate(-25 248 48)" /><rect className={cn(L, G)} x="96" y="30" width="9" height="5" rx="1" transform="rotate(-40 96 30)" /><rect className={cn(L, F0)} x="232" y="110" width="9" height="5" rx="1" transform="rotate(50 232 110)" /><rect className={cn(L, G)} x="60" y="130" width="9" height="5" rx="1" transform="rotate(-15 60 130)" /><rect className={cn(A)} x="265.5" y="79.5" width="9.0" height="9.0" rx="1.8" transform="rotate(45 270 84)" /><rect className={cn(A)} x="42.4" y="88.4" width="7.2" height="7.2" rx="1.4" transform="rotate(45 46 92)" /><path className={cn(L)} d="M146,200 h28" />
    </Frame>
  );
}

/** Pencarian tanpa hasil */
export function StateIllustrationNoResults(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="222" y="48" width="46" height="58" rx="4" transform="rotate(8 245 77)" /><path className={cn(L)} d="M232,66 h24 M231,78 h26 M230,90 h16" transform="rotate(8 245 77)" /><line x1="180" y1="136" x2="226" y2="184" className={cn(L)} strokeWidth={10} /><circle className={cn(L, F0)} cx="145" cy="100" r="48" /><circle className={cn(L)} cx="145" cy="100" r="36" /><path className={cn(L)} d="M134,90 q0,-13 12,-13 q12,0 12,12 q0,9 -12,13 v8" /><circle className={cn(G)} cx="146" cy="122" r="3" /><path className={cn(L)} d="M64,58 v12 M58,64 h12" /><circle className={cn(G)} cx="74" cy="160" r="3" />
    </Frame>
  );
}

/** Semua tugas selesai */
export function StateIllustrationCaughtUp(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="58" y="44" width="112" height="146" rx="8" /><circle className={cn(L, AS)} cx="80" cy="74" r="9" /><path className={cn(L)} d="M75,74 l4,4 l7,-8" /><line className={cn(L)} x1="98" y1="74" x2="150" y2="74" /><circle className={cn(L, AS)} cx="80" cy="108" r="9" /><path className={cn(L)} d="M75,108 l4,4 l7,-8" /><line className={cn(L)} x1="98" y1="108" x2="142" y2="108" /><circle className={cn(L, AS)} cx="80" cy="142" r="9" /><path className={cn(L)} d="M75,142 l4,4 l7,-8" /><line className={cn(L)} x1="98" y1="142" x2="150" y2="142" /><line className={cn(L)} x1="72" y1="170" x2="120" y2="170" /><rect className={cn(L, F0)} x="200" y="122" width="56" height="70" rx="6" /><path className={cn(L)} d="M256,138 C278,138 278,170 256,170" /><path className={cn(L, AS)} d="M228,168 C216,158 214,150 220,146 C224,143 228,146 228,150 C228,146 232,143 236,146 C242,150 240,158 228,168 Z" /><path className={cn(L)} d="M214,110 q6,-8 0,-16 M228,110 q6,-8 0,-16 M242,110 q6,-8 0,-16" /><rect className={cn(A)} x="257.5" y="51.5" width="9.0" height="9.0" rx="1.8" transform="rotate(45 262 56)" />
    </Frame>
  );
}

/** Fitur terkunci / upgrade */
export function StateIllustrationLocked(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L)} strokeWidth={4} d="M136,104 V82 a24,24 0 0 1 48,0 V104" /><rect className={cn(L, AS)} x="116" y="102" width="88" height="80" rx="12" /><circle className={cn(G)} cx="160" cy="134" r="8" /><path className={cn(L)} d="M160,140 v16" /><rect className={cn(L, F0)} x="220" y="126" width="58" height="28" rx="14" /><path className={cn(A)} d="M249.0,132.0 L251.0,137.2 L256.6,137.5 L252.2,141.1 L253.7,146.5 L249.0,143.4 L244.3,146.5 L245.8,141.1 L241.4,137.5 L247.0,137.2 Z" /><rect className={cn(A)} x="229.7" y="57.7" width="12.6" height="12.6" rx="2.5" transform="rotate(45 236 64)" /><rect className={cn(A)} x="258.85" y="88.85" width="6.3" height="6.3" rx="1.3" transform="rotate(45 262 92)" /><path className={cn(L)} d="M66,77 v14 M59,84 h14" /><circle className={cn(G)} cx="72" cy="150" r="3" />
    </Frame>
  );
}

/** Proses panjang (async) */
export function StateIllustrationProcessing(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><line className={cn(L)} x1="124" y1="42" x2="196" y2="42" /><line className={cn(L)} x1="124" y1="192" x2="196" y2="192" /><path className={cn(L, F0)} d="M136,45 C136,95 156,105 156,117 C156,129 136,139 136,189 L184,189 C184,139 164,129 164,117 C164,105 184,95 184,45 Z" /><path className={cn(L, AS)} d="M145,70 L175,70 C173,88 165,96 160,101 C155,96 147,88 145,70 Z" /><path className={cn(L, AS)} d="M144,189 C148,166 156,158 160,150 C164,158 172,166 176,189 Z" /><path className={cn(L)} strokeDasharray="1 7" d="M160,106 V146" /><rect className={cn(A)} x="223.35" y="61.35" width="17.3" height="17.3" rx="3.5" transform="rotate(45 232 70)" /><rect className={cn(A)} x="254.4" y="100.4" width="7.2" height="7.2" rx="1.4" transform="rotate(45 258 104)" /><rect className={cn(A)} x="79.95" y="69.95" width="8.1" height="8.1" rx="1.6" transform="rotate(45 84 74)" /><circle className={cn(G)} cx="80" cy="150" r="3" />
    </Frame>
  );
}

/** Offline / koneksi putus */
export function StateIllustrationOffline(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L)} d="M30,160 C70,160 80,124 112,124" /><rect className={cn(L, F0)} x="112" y="110" width="32" height="28" rx="5" /><path className={cn(L)} d="M144,116 h14 M144,132 h14" /><rect className={cn(L, AS)} x="184" y="104" width="38" height="40" rx="7" /><circle className={cn(G)} cx="197" cy="124" r="3" /><circle className={cn(G)} cx="209" cy="124" r="3" /><path className={cn(L)} d="M222,124 C254,124 262,160 292,160" /><path className={cn(L)} d="M168,96 l-4,-10 M176,98 l6,-9 M160,104 l-9,-4" /><path className={cn(L, F0)} d="M118,72 C110,72 106,64 110,58 C112,52 120,50 124,53 C127,42 142,40 148,48 C156,44 166,50 164,60 C172,62 172,72 164,72 Z" /><path className={cn(L)} d="M128,56 l14,12 M142,56 l-14,12" /><path className={cn(L)} d="M262,53 v14 M255,60 h14" />
    </Frame>
  );
}

/** 404 halaman tidak ditemukan */
export function StateIllustrationNotFound(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L)} d="M84,196 V66" /><path className={cn(L, F0)} d="M58,70 H106 L116,80 L106,90 H58 Z" /><path className={cn(L, AS)} d="M110,104 H62 L52,114 L62,124 H110 Z" /><path className={cn(L)} d="M66,80 h26 M70,114 h28" /><path className={cn(L, F0)} d="M236,150 C236,150 208,120 208,99 A28,28 0 0 1 264,99 C264,120 236,150 236,150 Z" /><circle className={cn(L, AS)} cx="236" cy="99" r="10" /><circle className={cn(L, AS)} cx="160" cy="112" r="40" /><circle className={cn(L, F0)} cx="160" cy="112" r="16" /><path className={cn(L)} d="M132,84 l8,8 M188,84 l-8,8 M132,140 l8,-8 M188,140 l-8,-8" /><path className={cn(L)} strokeDasharray="2 8" d="M60,190 C110,172 200,196 262,176" /><rect className={cn(A)} x="257.5" y="43.5" width="9.0" height="9.0" rx="1.8" transform="rotate(45 262 48)" /><path className={cn(L)} d="M52,36 v12 M46,42 h12" /><circle className={cn(G)} cx="160" cy="52" r="3" />
    </Frame>
  );
}

/** 403 akses ditolak */
export function StateIllustrationForbidden(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="96" y="40" width="100" height="160" rx="4" /><rect className={cn(L)} x="110" y="56" width="72" height="56" rx="3" /><rect className={cn(L)} x="110" y="124" width="72" height="56" rx="3" /><circle className={cn(G)} cx="182" cy="120" r="5" /><path className={cn(L, AS)} d="M236,90 L270,101 L270,132 C270,156 254,168 236,178 C218,168 202,156 202,132 L202,101 Z" /><line x1="222" y1="132" x2="250" y2="132" className={cn(L)} strokeWidth={5} /><path className={cn(L)} d="M66,65 v14 M59,72 h14" /><circle className={cn(G)} cx="60" cy="150" r="3" />
    </Frame>
  );
}

/** 500 server error */
export function StateIllustrationServerError(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><circle className={cn(L, F0)} cx="146" cy="44" r="10" /><circle className={cn(L, F0)} cx="164" cy="32" r="13" /><circle className={cn(L, F0)} cx="186" cy="26" r="9" /><rect className={cn(L, F0)} x="108" y="60" width="104" height="136" rx="8" /><line className={cn(L)} x1="108" y1="104" x2="212" y2="104" /><line className={cn(L)} x1="108" y1="150" x2="212" y2="150" /><circle className={cn(G)} cx="140" cy="78" r="3" /><circle className={cn(G)} cx="162" cy="78" r="3" /><path className={cn(L)} d="M143,94 q10,-7 20,0" /><circle className={cn(L, AS)} cx="192" cy="127" r="5" /><circle className={cn(G)} cx="192" cy="173" r="5" /><line className={cn(L)} x1="124" y1="127" x2="160" y2="127" /><line className={cn(L)} x1="124" y1="173" x2="160" y2="173" /><g transform="rotate(-24 196 96)"><rect className={cn(L, AS)} x="166" y="87" width="62" height="18" rx="9" /><rect className={cn(L, F0)} x="188" y="89" width="18" height="14" rx="2" /></g><path className={cn(L)} d="M260,63 v14 M253,70 h14" /><circle className={cn(G)} cx="64" cy="120" r="3" />
    </Frame>
  );
}

/** Pemeliharaan terjadwal */
export function StateIllustrationMaintenance(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="96" y="184" width="104" height="14" rx="3" /><path className={cn(L, AS)} d="M112,184 L140,72 L156,72 L184,184 Z" /><path className={cn(L, F0)} d="M131,108 L165,108 L171,132 L125,132 Z" /><path className={cn(L, F0)} d="M119,156 L177,156 L181,172 L115,172 Z" transform="translate(0,-2)" /><rect className={cn(L, F0)} x="232" y="49" width="12" height="14" rx="3" transform="rotate(0 238 78)" /><rect className={cn(L, F0)} x="232" y="49" width="12" height="14" rx="3" transform="rotate(45 238 78)" /><rect className={cn(L, F0)} x="232" y="49" width="12" height="14" rx="3" transform="rotate(90 238 78)" /><rect className={cn(L, F0)} x="232" y="49" width="12" height="14" rx="3" transform="rotate(135 238 78)" /><rect className={cn(L, F0)} x="232" y="49" width="12" height="14" rx="3" transform="rotate(180 238 78)" /><rect className={cn(L, F0)} x="232" y="49" width="12" height="14" rx="3" transform="rotate(225 238 78)" /><rect className={cn(L, F0)} x="232" y="49" width="12" height="14" rx="3" transform="rotate(270 238 78)" /><rect className={cn(L, F0)} x="232" y="49" width="12" height="14" rx="3" transform="rotate(315 238 78)" /><circle className={cn(L, F0)} cx="238" cy="78" r="20" /><circle className={cn(L, AS)} cx="238" cy="78" r="8.0" /><rect className={cn(L, F0)} x="256" y="111" width="12" height="14" rx="3" transform="rotate(0 262 132)" /><rect className={cn(L, F0)} x="256" y="111" width="12" height="14" rx="3" transform="rotate(45 262 132)" /><rect className={cn(L, F0)} x="256" y="111" width="12" height="14" rx="3" transform="rotate(90 262 132)" /><rect className={cn(L, F0)} x="256" y="111" width="12" height="14" rx="3" transform="rotate(135 262 132)" /><rect className={cn(L, F0)} x="256" y="111" width="12" height="14" rx="3" transform="rotate(180 262 132)" /><rect className={cn(L, F0)} x="256" y="111" width="12" height="14" rx="3" transform="rotate(225 262 132)" /><rect className={cn(L, F0)} x="256" y="111" width="12" height="14" rx="3" transform="rotate(270 262 132)" /><rect className={cn(L, F0)} x="256" y="111" width="12" height="14" rx="3" transform="rotate(315 262 132)" /><circle className={cn(L, F0)} cx="262" cy="132" r="12" /><circle className={cn(L, AS)} cx="262" cy="132" r="4.800000000000001" /><path className={cn(L)} d="M62,71 v14 M55,78 h14" /><circle className={cn(G)} cx="66" cy="150" r="3" />
    </Frame>
  );
}

/** Belum ada transaksi */
export function StateIllustrationLedgerEmpty(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L, F0)} d="M60,72 Q110,60 160,76 V186 Q110,170 60,182 Z" /><path className={cn(L, F0)} d="M160,76 Q210,60 260,72 V182 Q210,170 160,186 Z" /><line className={cn(L)} x1="76" y1="100" x2="142" y2="100" /><line className={cn(L)} x1="76" y1="120" x2="142" y2="120" /><line className={cn(L)} x1="76" y1="140" x2="142" y2="140" /><line className={cn(L)} x1="76" y1="160" x2="142" y2="160" /><g transform="rotate(-38 222 128)"><rect className={cn(L, AS)} x="186" y="120" width="64" height="16" rx="2" /><path className={cn(L, F0)} d="M186,120 L170,128 L186,136 Z" /><rect className={cn(L, G)} x="250" y="120" width="10" height="16" rx="2" /></g><circle className={cn(L, AS)} cx="252" cy="42" r="18" /><path className={cn(L)} d="M252,35 v14 M245,42 h14" /><rect className={cn(A)} x="41.95" y="45.95" width="8.1" height="8.1" rx="1.6" transform="rotate(45 46 50)" />
    </Frame>
  );
}

/** Rekonsiliasi cocok */
export function StateIllustrationLedgerReconciled(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="124" y="186" width="72" height="12" rx="3" /><line className={cn(L)} x1="160" y1="66" x2="160" y2="186" /><line className={cn(L)} x1="78" y1="72" x2="242" y2="72" /><circle className={cn(L, AS)} cx="160" cy="62" r="7" /><path className={cn(L)} d="M88,72 L66,134 M88,72 L110,134 M232,72 L210,134 M232,72 L254,134" /><path className={cn(L, F0)} d="M58,134 H118 Q112,152 88,152 Q64,152 58,134 Z" /><path className={cn(L, F0)} d="M202,134 H262 Q256,152 232,152 Q208,152 202,134 Z" /><ellipse className={cn(L, F0)} cx="88" cy="128" rx="16" ry="5" /><ellipse className={cn(L, F0)} cx="88" cy="120" rx="16" ry="5" /><ellipse className={cn(L, F0)} cx="88" cy="112" rx="16" ry="5" /><rect className={cn(L, F0)} x="220" y="104" width="24" height="30" rx="2" /><path className={cn(L)} d="M225,114 h14 M225,122 h10" /><circle className={cn(L, F0)} cx="264" cy="36" r="14" /><path className={cn(L)} d="M258,36 l4,4 l8,-9" />
    </Frame>
  );
}

/** Ada selisih rekonsiliasi */
export function StateIllustrationLedgerMismatch(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L, F0)} d="M58,48 H124 V158 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 Z" /><line className={cn(L)} x1="70" y1="70" x2="112" y2="70" /><line className={cn(L)} x1="70" y1="86" x2="112" y2="86" /><line className={cn(L)} x1="70" y1="102" x2="112" y2="102" /><line className={cn(L)} x1="70" y1="130" x2="112" y2="130" /><path className={cn(L, F0)} d="M196,48 H262 V158 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 l-5.5,-6 l-5.5,6 Z" /><line className={cn(L)} x1="208" y1="70" x2="250" y2="70" /><line className={cn(L)} x1="208" y1="86" x2="250" y2="86" /><line className={cn(L)} x1="208" y1="102" x2="250" y2="102" /><line className={cn(L)} x1="208" y1="130" x2="236" y2="130" /><circle className={cn(L, AS)} cx="160" cy="104" r="20" /><path className={cn(L)} d="M151,99 h18 M151,109 h18 M165,92 L155,116" /><path className={cn(L)} d="M160,170 v12 M154,176 h12" />
    </Frame>
  );
}

/** Koneksi bank kedaluwarsa */
export function StateIllustrationLedgerBankSync(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L, AS)} d="M70,86 L130,56 L190,86 Z" /><rect className={cn(L, F0)} x="74" y="86" width="112" height="12" rx="2" /><rect className={cn(L, F0)} x="84" y="100" width="14" height="70" rx="2" /><rect className={cn(L, F0)} x="113" y="100" width="14" height="70" rx="2" /><rect className={cn(L, F0)} x="142" y="100" width="14" height="70" rx="2" /><rect className={cn(L, F0)} x="168" y="100" width="14" height="70" rx="2" /><rect className={cn(L, F0)} x="66" y="172" width="128" height="14" rx="3" /><rect className={cn(L, F0)} x="206" y="104" width="34" height="18" rx="9" transform="rotate(-30 223 113)" /><rect className={cn(L, F0)} x="244" y="130" width="34" height="18" rx="9" transform="rotate(-30 261 139)" /><path className={cn(L)} d="M236,112 l-6,-8 M246,118 l10,-4 M240,128 l4,9" /><rect className={cn(A)} x="257.95" y="49.95" width="8.1" height="8.1" rx="1.6" transform="rotate(45 262 54)" />
    </Frame>
  );
}

/** Belum ikut kelas */
export function StateIllustrationEduEmpty(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, AS)} x="92" y="168" width="136" height="30" rx="4" /><rect className={cn(L, F0)} x="102" y="138" width="118" height="30" rx="4" /><line className={cn(L)} x1="118" y1="138" x2="118" y2="168" /><rect className={cn(L, F0)} x="86" y="108" width="146" height="30" rx="4" transform="rotate(-4 159 123)" /><path className={cn(L, G)} d="M160,46 L218,66 L160,86 L102,66 Z" /><path className={cn(L, G)} d="M132,76 V92 Q160,106 188,92 V76 L160,86 Z" /><path className={cn(L)} d="M212,64 V92" /><circle className={cn(L, AS)} cx="212" cy="96" r="5" /><rect className={cn(A)} x="257.5" y="43.5" width="9.0" height="9.0" rx="1.8" transform="rotate(45 262 48)" /><path className={cn(L)} d="M56,84 v12 M50,90 h12" />
    </Frame>
  );
}

/** Kuis belum lulus */
export function StateIllustrationEduRetry(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="84" y="42" width="104" height="146" rx="6" transform="rotate(-4 136 115)" /><g transform="rotate(-4 136 115)"><line className={cn(L)} x1="100" y1="70" x2="160" y2="70" /><line className={cn(L)} x1="100" y1="86" x2="160" y2="86" /><circle className={cn(L)} cx="104" cy="112" r="5" /><line className={cn(L)} x1="116" y1="112" x2="166" y2="112" /><circle className={cn(L)} cx="104" cy="134" r="5" /><line className={cn(L)} x1="116" y1="134" x2="166" y2="134" /><circle className={cn(L)} cx="104" cy="156" r="5" /><line className={cn(L)} x1="116" y1="156" x2="166" y2="156" /></g><path className={cn(AL)} strokeWidth={6} d="M254,100 A34,34 0 1 1 238,76" /><path className={cn(L)} d="M254,100 A34,34 0 1 1 238,76" /><path className={cn(L)} d="M226,64 L240,76 L226,86" /><rect className={cn(A)} x="54.4" y="56.4" width="7.2" height="7.2" rx="1.4" transform="rotate(45 58 60)" /><circle className={cn(G)} cx="60" cy="160" r="3" />
    </Frame>
  );
}

/** Kelas selesai / sertifikat */
export function StateIllustrationEduComplete(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="56" y="46" width="176" height="116" rx="6" /><rect className={cn(L)} x="66" y="56" width="156" height="96" rx="3" /><line className={cn(L)} x1="104" y1="82" x2="184" y2="82" /><line className={cn(L)} x1="90" y1="104" x2="198" y2="104" /><line className={cn(L)} x1="90" y1="118" x2="198" y2="118" /><line className={cn(L)} x1="90" y1="136" x2="140" y2="136" /><path className={cn(L, G)} d="M222,160 L212,196 L226,188 L234,200 L240,164 Z" /><path className={cn(L, G)} d="M246,164 L254,200 L260,188 L274,196 L262,160 Z" /><circle className={cn(L, AS)} cx="242" cy="152" r="24" /><rect className={cn(A)} x="237.5" y="147.5" width="9.0" height="9.0" rx="1.8" transform="rotate(45 242 152)" /><rect className={cn(L, F0)} x="70" y="60" width="9" height="5" rx="1" transform="rotate(30 70 60)" /><rect className={cn(L, G)} x="248" y="48" width="9" height="5" rx="1" transform="rotate(-25 248 48)" /><rect className={cn(L, G)} x="96" y="30" width="9" height="5" rx="1" transform="rotate(-40 96 30)" /><rect className={cn(L, F0)} x="232" y="110" width="9" height="5" rx="1" transform="rotate(50 232 110)" /><rect className={cn(L, G)} x="60" y="130" width="9" height="5" rx="1" transform="rotate(-15 60 130)" />
    </Frame>
  );
}

/** Kembali belajar */
export function StateIllustrationEduComeback(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="60" y="54" width="112" height="120" rx="8" /><path className={cn(L, G)} d="M60,78 V62 Q60,54 68,54 H164 Q172,54 172,62 V78 Z" /><line className={cn(L)} x1="86" y1="46" x2="86" y2="62" /><line className={cn(L)} x1="146" y1="46" x2="146" y2="62" /><circle className={cn(G)} cx="78" cy="98" r="2.6" /><circle className={cn(G)} cx="97" cy="98" r="2.6" /><circle className={cn(G)} cx="116" cy="98" r="2.6" /><circle className={cn(G)} cx="135" cy="98" r="2.6" /><circle className={cn(G)} cx="154" cy="98" r="2.6" /><circle className={cn(G)} cx="78" cy="118" r="2.6" /><circle className={cn(G)} cx="97" cy="118" r="2.6" /><circle className={cn(G)} cx="116" cy="118" r="2.6" /><circle className={cn(G)} cx="135" cy="118" r="2.6" /><circle className={cn(G)} cx="154" cy="118" r="2.6" /><circle className={cn(G)} cx="78" cy="138" r="2.6" /><circle className={cn(G)} cx="97" cy="138" r="2.6" /><circle className={cn(G)} cx="116" cy="138" r="2.6" /><circle className={cn(G)} cx="154" cy="138" r="2.6" /><circle className={cn(L, AS)} cx="135" cy="138" r="10" /><path className={cn(L, AS)} d="M206,158 L262,158 L254,198 L214,198 Z" /><path className={cn(L)} d="M234,158 C234,138 234,124 236,110" /><path className={cn(L, F0)} d="M235,128 C220,126 210,114 208,100 C224,100 234,110 235,128 Z" /><path className={cn(L, F0)} d="M236,116 C240,98 254,90 268,90 C266,106 254,116 236,116 Z" /><rect className={cn(A)} x="265.95" y="45.95" width="8.1" height="8.1" rx="1.6" transform="rotate(45 270 50)" />
    </Frame>
  );
}

/** Recruiter: belum ada lowongan */
export function StateIllustrationHiringNoJobs(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><rect className={cn(L, F0)} x="78" y="44" width="136" height="146" rx="10" /><circle className={cn(L, AS)} cx="104" cy="72" r="13" /><line className={cn(L)} x1="126" y1="66" x2="190" y2="66" /><line className={cn(L)} x1="126" y1="80" x2="170" y2="80" /><line className={cn(L)} x1="96" y1="110" x2="196" y2="110" /><line className={cn(L)} x1="96" y1="126" x2="196" y2="126" /><line className={cn(L)} x1="96" y1="142" x2="196" y2="142" /><rect className={cn(L)} x="96" y="158" width="44" height="16" rx="8" /><rect className={cn(L)} x="148" y="158" width="44" height="16" rx="8" /><circle className={cn(L, G)} cx="232" cy="164" r="22" /><path d="M232,154 v20 M222,164 h20" className={cn(L)} /><rect className={cn(A)} x="247.5" y="53.5" width="9.0" height="9.0" rx="1.8" transform="rotate(45 252 58)" /><path className={cn(L)} d="M52,98 v12 M46,104 h12" />
    </Frame>
  );
}

/** Recruiter: menunggu pelamar */
export function StateIllustrationHiringWaiting(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><line className={cn(L)} x1="144" y1="128" x2="144" y2="198" /><path className={cn(L, F0)} d="M100,130 V104 A30,30 0 0 1 130,74 H188 V130 Z" /><path className={cn(L, F0)} d="M130,74 A30,30 0 0 1 160,104 V130 H100" /><path className={cn(L)} d="M188,112 V60" /><rect className={cn(L, AS)} x="188" y="60" width="26" height="16" rx="2" /><path className={cn(L)} strokeDasharray="2 8" d="M200,140 C230,130 234,100 240,86" /><rect className={cn(L, F0)} x="232" y="46" width="38" height="26" rx="3" /><path className={cn(L)} d="M232,48 l19,13 l19,-13" /><circle className={cn(G)} cx="64" cy="150" r="3" />
    </Frame>
  );
}

/** Kandidat: lamaran terkirim */
export function StateIllustrationHiringApplied(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><path className={cn(L)} strokeDasharray="2 8" d="M34,188 C60,176 40,150 62,138 C80,128 92,140 96,128" /><path className={cn(L, F0)} d="M98,122 L262,54 L188,170 L156,132 Z" /><path className={cn(L, AS)} d="M156,132 L166,172 L188,170 Z" /><path className={cn(L)} d="M156,132 L262,54" /><circle className={cn(L, F0)} cx="96" cy="62" r="16" /><path className={cn(L)} d="M89,62 l5,5 l9,-10" /><rect className={cn(A)} x="259.95" y="115.95" width="8.1" height="8.1" rx="1.6" transform="rotate(45 264 120)" /><path className={cn(L)} d="M230,176 v12 M224,182 h12" />
    </Frame>
  );
}

/** Kandidat: lowongan ditutup */
export function StateIllustrationHiringClosed(p: StateIllustrationProps) {
  return (
    <Frame {...p}>
      <ellipse className={cn(G)} cx="160" cy="204" rx="108" ry="8" /><circle className={cn(G)} cx="160" cy="40" r="5" /><path className={cn(L)} d="M160,40 L108,88 M160,40 L212,88" /><rect className={cn(L, AS)} x="96" y="86" width="128" height="62" rx="10" /><circle className={cn(L, F0)} cx="160" cy="117" r="20" /><rect className={cn(L, FS)} x="147" y="113" width="26" height="8" rx="2" /><rect className={cn(L, F0)} x="220" y="152" width="52" height="40" rx="6" /><path className={cn(L)} d="M236,152 V144 Q236,138 242,138 H250 Q256,138 256,144 V152" /><line className={cn(L)} x1="220" y1="168" x2="272" y2="168" /><path className={cn(L)} d="M62,64 v12 M56,70 h12" /><circle className={cn(G)} cx="66" cy="164" r="3" />
    </Frame>
  );
}

export const STATE_ILLUSTRATIONS = {
  "universal/welcome": StateIllustrationWelcome,
  "universal/empty": StateIllustrationEmpty,
  "universal/permission": StateIllustrationPermission,
  "universal/success": StateIllustrationSuccess,
  "universal/no-results": StateIllustrationNoResults,
  "universal/caught-up": StateIllustrationCaughtUp,
  "universal/locked": StateIllustrationLocked,
  "universal/processing": StateIllustrationProcessing,
  "universal/offline": StateIllustrationOffline,
  "universal/not-found": StateIllustrationNotFound,
  "universal/forbidden": StateIllustrationForbidden,
  "universal/server-error": StateIllustrationServerError,
  "universal/maintenance": StateIllustrationMaintenance,
  "ledger/empty": StateIllustrationLedgerEmpty,
  "ledger/reconciled": StateIllustrationLedgerReconciled,
  "ledger/mismatch": StateIllustrationLedgerMismatch,
  "ledger/bank-sync": StateIllustrationLedgerBankSync,
  "education/empty": StateIllustrationEduEmpty,
  "education/retry": StateIllustrationEduRetry,
  "education/complete": StateIllustrationEduComplete,
  "education/comeback": StateIllustrationEduComeback,
  "hiring/no-jobs": StateIllustrationHiringNoJobs,
  "hiring/waiting": StateIllustrationHiringWaiting,
  "hiring/applied": StateIllustrationHiringApplied,
  "hiring/closed": StateIllustrationHiringClosed,
} as const;

export type StateIllustrationId = keyof typeof STATE_ILLUSTRATIONS;

/** What moment each illustration is for (Bahasa Indonesia, from the source package). */
const STATE_STATE: Record<StateIllustrationId, string> = {
  "universal/welcome": "Onboarding: selamat datang",
  "universal/empty": "Empty state: pertama kali",
  "universal/permission": "Permintaan izin akses",
  "universal/success": "Sukses / milestone",
  "universal/no-results": "Pencarian tanpa hasil",
  "universal/caught-up": "Semua tugas selesai",
  "universal/locked": "Fitur terkunci / upgrade",
  "universal/processing": "Proses panjang (async)",
  "universal/offline": "Offline / koneksi putus",
  "universal/not-found": "404 halaman tidak ditemukan",
  "universal/forbidden": "403 akses ditolak",
  "universal/server-error": "500 server error",
  "universal/maintenance": "Pemeliharaan terjadwal",
  "ledger/empty": "Belum ada transaksi",
  "ledger/reconciled": "Rekonsiliasi cocok",
  "ledger/mismatch": "Ada selisih rekonsiliasi",
  "ledger/bank-sync": "Koneksi bank kedaluwarsa",
  "education/empty": "Belum ikut kelas",
  "education/retry": "Kuis belum lulus",
  "education/complete": "Kelas selesai / sertifikat",
  "education/comeback": "Kembali belajar",
  "hiring/no-jobs": "Recruiter: belum ada lowongan",
  "hiring/waiting": "Recruiter: menunggu pelamar",
  "hiring/applied": "Kandidat: lamaran terkirim",
  "hiring/closed": "Kandidat: lowongan ditutup",
};


export type StateIllustrationGroup = "universal" | "ledger" | "education" | "hiring";

/** Ordered catalogue with metadata (docs gallery, SVG export, tests). `file` = SVG name in assets/illustrations/state. */
export const STATE_ILLUSTRATION_LIST: { id: StateIllustrationId; file: string; group: StateIllustrationGroup; name: string; state: string; Component: (typeof STATE_ILLUSTRATIONS)[StateIllustrationId] }[] = (
  Object.keys(STATE_ILLUSTRATIONS) as StateIllustrationId[]
).map((id) => ({ id, file: id.replace("/", "-"), group: id.split("/")[0] as StateIllustrationGroup, name: STATE_ILLUSTRATIONS[id].name, state: STATE_STATE[id], Component: STATE_ILLUSTRATIONS[id] }));
