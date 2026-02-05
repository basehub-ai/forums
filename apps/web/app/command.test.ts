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

  it("parses -r flag (short)", () => {
    const result = parseArgs({
      argv: ["vercel/next.js", "-r", "main", "--", "ls", "-la"],
    })
    expect(result).toEqual({
      repo: "vercel/next.js",
      ref: "main",
      version: undefined,
      command: "ls -la",
    })
  })

  it("parses --ref flag (long)", () => {
    const result = parseArgs({
      argv: ["vercel/next.js", "--ref", "canary", "--", "cat", "README.md"],
    })
    expect(result).toEqual({
      repo: "vercel/next.js",
      ref: "canary",
      version: undefined,
      command: "cat README.md",
    })
  })

  it("parses -v flag (short)", () => {
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

  it("parses --version flag (long)", () => {
    const result = parseArgs({
      argv: ["next", "--version", "15.0.0", "--", "ls", "packages/"],
    })
    expect(result).toEqual({
      repo: "next",
      ref: undefined,
      version: "15.0.0",
      command: "ls packages/",
    })
  })

  it("parses both --ref and -v flags", () => {
    const result = parseArgs({
      argv: [
        "vercel/next.js",
        "--ref",
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
      argv: ["owner/repo", "--version", "1.0.0", "-r", "dev", "--", "pwd"],
    })
    expect(result).toEqual({
      repo: "owner/repo",
      ref: "dev",
      version: "1.0.0",
      command: "pwd",
    })
  })

  it("returns null when missing -- separator", () => {
    const result = parseArgs({ argv: ["vercel/next.js", "grep", "foo"] })
    expect(result).toBeNull()
  })

  it("returns null when missing command after --", () => {
    const result = parseArgs({ argv: ["vercel/next.js", "--"] })
    expect(result).toBeNull()
  })

  it("returns null when missing repo", () => {
    const result = parseArgs({ argv: ["--", "ls"] })
    expect(result).toBeNull()
  })

  it("returns null when --ref has no value", () => {
    const result = parseArgs({ argv: ["repo", "--ref", "--", "ls"] })
    expect(result).toBeNull()
  })

  it("returns null when --version has no value", () => {
    const result = parseArgs({ argv: ["repo", "--version", "--", "ls"] })
    expect(result).toBeNull()
  })

  it("returns null on unknown flag", () => {
    const result = parseArgs({ argv: ["repo", "-unknown", "val", "--", "ls"] })
    expect(result).toBeNull()
  })
})
