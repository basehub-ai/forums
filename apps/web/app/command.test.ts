import { describe, expect, it } from "bun:test"
import { parseArgs } from "./command"

describe("parseArgs", () => {
  it("parses repo and command", () => {
    const result = parseArgs({
      argv: ["vercel/next.js", "--", "grep", "export"],
    })
    expect(result).toEqual({
      repo: "vercel/next.js",
      ref: undefined,
      version: undefined,
      command: "grep export",
    })
  })

  it("parses -ref flag", () => {
    const result = parseArgs({
      argv: ["vercel/next.js", "-ref", "main", "--", "ls", "-la"],
    })
    expect(result).toEqual({
      repo: "vercel/next.js",
      ref: "main",
      version: undefined,
      command: "ls -la",
    })
  })

  it("parses -v flag", () => {
    const result = parseArgs({
      argv: [
        "vercel/next.js",
        "-v",
        "13.0.0",
        "--",
        "find",
        ".",
        "-name",
        "*.ts",
      ],
    })
    expect(result).toEqual({
      repo: "vercel/next.js",
      ref: undefined,
      version: "13.0.0",
      command: "find . -name *.ts",
    })
  })

  it("parses both -ref and -v flags", () => {
    const result = parseArgs({
      argv: [
        "vercel/next.js",
        "-ref",
        "canary",
        "-v",
        "14.0.0",
        "--",
        "echo",
        "hi",
      ],
    })
    expect(result).toEqual({
      repo: "vercel/next.js",
      ref: "canary",
      version: "14.0.0",
      command: "echo hi",
    })
  })

  it("handles flags in any order", () => {
    const result = parseArgs({
      argv: ["owner/repo", "-v", "1.0.0", "-ref", "dev", "--", "pwd"],
    })
    expect(result).toEqual({
      repo: "owner/repo",
      ref: "dev",
      version: "1.0.0",
      command: "pwd",
    })
  })

  it("throws when missing -- separator", () => {
    expect(() =>
      parseArgs({ argv: ["vercel/next.js", "grep", "foo"] })
    ).toThrow("Missing -- separator before command")
  })

  it("throws when missing command after --", () => {
    expect(() => parseArgs({ argv: ["vercel/next.js", "--"] })).toThrow(
      "Missing command after --"
    )
  })

  it("throws when missing repo", () => {
    expect(() => parseArgs({ argv: ["--", "ls"] })).toThrow("Missing repo")
  })

  it("throws when -ref has no value", () => {
    expect(() => parseArgs({ argv: ["repo", "-ref", "--", "ls"] })).toThrow(
      "Missing value for -ref"
    )
  })

  it("throws when -v has no value", () => {
    expect(() => parseArgs({ argv: ["repo", "-v", "--", "ls"] })).toThrow(
      "Missing value for -v"
    )
  })

  it("throws on unknown flag", () => {
    expect(() =>
      parseArgs({ argv: ["repo", "-unknown", "val", "--", "ls"] })
    ).toThrow("Unknown flag: -unknown")
  })
})
