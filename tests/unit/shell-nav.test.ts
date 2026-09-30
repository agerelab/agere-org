import { describe, expect, it } from "vitest";
import { manageHome, orgLinksFor, pageKey, sectionOf } from "@/ui/shell/nav";

describe("shell navigation (UI-01 Navigasi ganda)", () => {
  it("maps paths to rail sections", () => {
    expect(sectionOf("desk/kotak-masuk")).toBe("desk");
    expect(sectionOf("s")).toBe("space");
    expect(sectionOf("s/marketing/prj_1/papan")).toBe("space");
    expect(sectionOf("organisasi/anggota")).toBe("manage");
  });

  it("hides Owner/Admin-only Organisasi pages from members (PRD-02 §6.6)", () => {
    expect(orgLinksFor("member").map((l) => l.path)).toEqual(["organisasi/umum", "organisasi/anggota", "organisasi/tim", "organisasi/sampah"]);
    expect(orgLinksFor("admin")).toHaveLength(7);
    expect(manageHome("owner")).toBe("organisasi/umum");
    expect(manageHome("member")).toBe("organisasi/umum");
  });

  it("names the current page for breadcrumbs and titles", () => {
    expect(pageKey("desk/tugas-saya")).toBe("nav.myTasks");
    expect(pageKey("organisasi/audit")).toBe("nav.audit");
    expect(pageKey("s")).toBeUndefined();
  });
});
