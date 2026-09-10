import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MeilisearchApiError, type Meilisearch, type Task } from "meilisearch";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import packageJson from "../../package.json";
import type { DatasetModule, DataWriter, IndexDef } from "./core/types";
import { recordIndexFreshness } from "./freshness";
import { runIngest } from "./ingest";

vi.mock("./freshness", () => ({ recordIndexFreshness: vi.fn() }));

function fixture(rowCount = 1) {
  const store: DataWriter = { getJson: vi.fn(), putJson: vi.fn() };
  const makeIndex = (name: string, settingsTask: number, documentTask: number, rows: number) => {
    let taskUid = documentTask;
    const definition = {
      index: name,
      settings: {
        searchableAttributes: ["title"],
        filterableAttributes: ["kind"],
        sortableAttributes: ["title"],
      },
      read: vi.fn(async function* () {
        for (let row = 0; row < rows; row++) {
          yield { id: `events.ubc.ca?id=${row}`, title: `Event ${row}`, kind: "event" };
        }
      }),
      transform: vi.fn((row: { id: string; title: string; kind: string }) => ({ id: row.id, doc: row })),
      derive: vi.fn<NonNullable<IndexDef["derive"]>>().mockResolvedValue(undefined),
    } satisfies IndexDef;
    return {
      definition,
      updateSettings: vi.fn().mockResolvedValue({ taskUid: settingsTask }),
      addDocuments: vi.fn(async (_docs: Record<string, unknown>[]) => ({ taskUid: taskUid++ })),
    };
  };
  const first = makeIndex("first", 2, 3, rowCount);
  const second = makeIndex("second", 102, 103, 1);
  const createIndex = vi.fn(async (name: string) => ({ taskUid: name === "first" ? 1 : 101 }));
  const waitForTask = vi.fn(async (uid: number): Promise<Pick<Task, "uid" | "status" | "error">> => ({
    uid,
    status: "succeeded",
    error: null,
  }));
  const search = {
    createIndex,
    index: vi.fn((name: string) => (name === "first" ? first : second)),
    tasks: { waitForTask },
  } as unknown as Meilisearch;
  const modules: DatasetModule[] = [{ name: "fixtures", indices: [first.definition, second.definition], tools: [] }];
  return { first, second, store, search, modules, createIndex, waitForTask };
}

beforeEach(() => {
  vi.mocked(recordIndexFreshness).mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("ingest command environment", () => {
  it.each([
    { name: "loads the optional .env", envFile: true, inherited: false },
    { name: "preserves inherited overrides", envFile: true, inherited: true },
    { name: "accepts Docker environment without .env", envFile: false, inherited: true },
  ])(
    "$name",
    ({ envFile, inherited }) => {
      const [command, ...args] = packageJson.scripts.ingest.split(" ");
      expect(command).toBe("node");
      const directory = mkdtempSync(join(tmpdir(), "reodite-ingest-env-"));
      const fileValues = {
        MEILI_URL: "http://file.invalid",
        MEILI_MASTER_KEY: "dummy-file-key",
        DATA_PATH: "/dummy-file-data",
      };
      const inheritedValues = {
        MEILI_URL: "http://inherited.invalid",
        MEILI_MASTER_KEY: "dummy-inherited-key",
        DATA_PATH: "/dummy-inherited-data",
      };
      try {
        mkdirSync(join(directory, "scripts"));
        symlinkSync(new URL("../../node_modules", import.meta.url), join(directory, "node_modules"), "dir");
        writeFileSync(
          join(directory, "scripts/ingest.ts"),
          "const values: Record<string, string | undefined> = { MEILI_URL: process.env.MEILI_URL, MEILI_MASTER_KEY: process.env.MEILI_MASTER_KEY, DATA_PATH: process.env.DATA_PATH }; process.stdout.write(JSON.stringify(values));",
        );
        if (envFile) {
          writeFileSync(
            join(directory, ".env"),
            Object.entries(fileValues)
              .map(([key, value]) => `${key}=${value}`)
              .join("\n"),
          );
        }
        const output = execFileSync(process.execPath, args, {
          cwd: directory,
          env: inherited ? inheritedValues : {},
          encoding: "utf8",
          stdio: "pipe",
          timeout: 10_000,
        });
        expect(JSON.parse(output)).toEqual(inherited ? inheritedValues : fileValues);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
    15_000,
  );
});

describe("runIngest", () => {
  it("awaits each task, batches sanitized documents, and finishes indexes sequentially", async () => {
    const f = fixture(501);

    await expect(runIngest(f.modules, f.search, f.store)).resolves.toBeUndefined();

    expect(f.createIndex.mock.calls).toEqual([
      ["first", { primaryKey: "id" }],
      ["second", { primaryKey: "id" }],
    ]);
    expect(f.waitForTask.mock.calls).toEqual([[1], [2], [3], [4], [101], [102], [103]]);
    expect(f.first.updateSettings).toHaveBeenCalledExactlyOnceWith(f.first.definition.settings);
    expect(f.first.addDocuments.mock.calls.map(([docs]) => docs.length)).toEqual([500, 1]);
    expect(f.first.addDocuments.mock.calls[0][0][0]).toEqual({
      id: "events_ubc_ca_id_0",
      title: "Event 0",
      kind: "event",
    });
    expect(f.first.addDocuments.mock.calls[1][0][0]).toEqual({
      id: "events_ubc_ca_id_500",
      title: "Event 500",
      kind: "event",
    });
    expect(f.first.definition.derive).toHaveBeenCalledExactlyOnceWith(f.store);
    expect(f.second.definition.derive).toHaveBeenCalledExactlyOnceWith(f.store);
    expect(vi.mocked(recordIndexFreshness).mock.calls).toEqual([["first"], ["second"]]);
    expect(f.waitForTask.mock.invocationCallOrder[3]).toBeLessThan(
      f.first.definition.derive.mock.invocationCallOrder[0],
    );
    expect(f.first.definition.derive.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(recordIndexFreshness).mock.invocationCallOrder[0],
    );
    expect(vi.mocked(recordIndexFreshness).mock.invocationCallOrder[0]).toBeLessThan(
      f.createIndex.mock.invocationCallOrder[1],
    );
    expect(f.store.getJson).not.toHaveBeenCalled();
    expect(f.store.putJson).not.toHaveBeenCalled();
  });

  it.each(["queued", "HTTP"])("accepts only index_already_exists during %s creation", async (outcome) => {
    const f = fixture();
    const error = {
      message: "Index first already exists",
      code: "index_already_exists",
      type: "invalid_request",
      link: "https://example.invalid/errors#index_already_exists",
    };
    if (outcome === "queued") {
      f.waitForTask.mockImplementation(async (uid) => ({
        uid,
        status: uid === 1 ? "failed" : "succeeded",
        error: uid === 1 ? error : null,
      }));
    } else {
      f.createIndex.mockRejectedValueOnce(new MeilisearchApiError(new Response(null, { status: 400 }), error));
    }

    await expect(runIngest(f.modules, f.search, f.store)).resolves.toBeUndefined();

    expect(f.first.updateSettings).toHaveBeenCalledExactlyOnceWith(f.first.definition.settings);
    expect(f.first.definition.derive).toHaveBeenCalledExactlyOnceWith(f.store);
    expect(vi.mocked(recordIndexFreshness).mock.calls).toEqual([["first"], ["second"]]);
  });

  it.each([
    [
      "HTTP authorization",
      new MeilisearchApiError(new Response(null, { status: 403 }), {
        message: "Invalid API key",
        code: "invalid_api_key",
        type: "auth",
        link: "https://example.invalid/errors#invalid_api_key",
      }),
    ],
    ["network", new Error("Connection refused")],
    ["uncoded already-exists", new Error("Index already exists")],
  ])("rejects a %s creation failure after processing the next index", async (_label, error) => {
    const f = fixture();
    f.createIndex.mockRejectedValueOnce(error);

    await expect(runIngest(f.modules, f.search, f.store)).rejects.toMatchObject({
      errors: [expect.objectContaining({ cause: error, message: expect.stringContaining("first") })],
    });

    expect(f.first.updateSettings).not.toHaveBeenCalled();
    expect(f.first.addDocuments).not.toHaveBeenCalled();
    expect(f.first.definition.derive).not.toHaveBeenCalled();
    expect(f.second.definition.derive).toHaveBeenCalledExactlyOnceWith(f.store);
    expect(f.createIndex).toHaveBeenCalledTimes(2);
    expect(vi.mocked(recordIndexFreshness).mock.calls).toEqual([["second"]]);
  });

  it.each([
    ["creation", 1, "failed", "invalid_index_uid"],
    ["settings", 2, "failed", "invalid_settings"],
    ["documents", 3, "failed", "invalid_document_id"],
    ["settings", 2, "failed", "index_already_exists"],
    ["documents", 3, "failed", "index_already_exists"],
    ["documents", 3, "canceled", null],
  ] as const)("rejects %s task %i (%s, %s) without deriving or stamping it", async (stage, taskUid, status, code) => {
    const f = fixture();
    const error = code
      ? { message: `${stage} rejected`, code, type: "invalid_request", link: "https://example.invalid/errors" }
      : null;
    f.waitForTask.mockImplementation(async (uid) => ({
      uid,
      status: uid === taskUid ? status : "succeeded",
      error: uid === taskUid ? error : null,
    }));

    await expect(runIngest(f.modules, f.search, f.store)).rejects.toMatchObject({
      errors: [expect.objectContaining({ message: expect.stringContaining(error?.message ?? "canceled") })],
    });

    expect(f.first.updateSettings).toHaveBeenCalledTimes(stage === "creation" ? 0 : 1);
    expect(f.first.addDocuments).toHaveBeenCalledTimes(stage === "documents" ? 1 : 0);
    expect(f.first.definition.derive).not.toHaveBeenCalled();
    expect(f.second.definition.derive).toHaveBeenCalledExactlyOnceWith(f.store);
    expect(vi.mocked(recordIndexFreshness).mock.calls).toEqual([["second"]]);
  });

  it.each([1, 2])("collects %s derive failures after attempting both indexes", async (failures) => {
    const f = fixture();
    const errors = [new Error("First derive failed"), new Error("Second derive failed")];
    f.first.definition.derive.mockRejectedValueOnce(errors[0]);
    if (failures === 2) f.second.definition.derive.mockRejectedValueOnce(errors[1]);

    await expect(runIngest(f.modules, f.search, f.store)).rejects.toMatchObject({
      errors: errors.slice(0, failures).map((cause) => expect.objectContaining({ cause })),
    });

    expect(f.first.definition.derive).toHaveBeenCalledExactlyOnceWith(f.store);
    expect(f.second.definition.derive).toHaveBeenCalledExactlyOnceWith(f.store);
    expect(vi.mocked(recordIndexFreshness).mock.calls).toEqual(failures === 1 ? [["second"]] : []);
  });
});
