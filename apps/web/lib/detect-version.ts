import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

function stripVersionPrefix(version: string): string {
  return version.replace(/^[\^~>=<]+/, "")
}

async function getVersionFromNodeModules({
  packageName,
  cwd,
}: {
  packageName: string
  cwd: string
}): Promise<string | null> {
  const packageJsonPath = join(cwd, "node_modules", packageName, "package.json")

  if (!existsSync(packageJsonPath)) return null

  try {
    const content = await readFile(packageJsonPath, "utf-8")
    const pkg = JSON.parse(content) as { version?: string }
    return pkg.version || null
  } catch {
    return null
  }
}

async function getVersionFromPackageLock({
  packageName,
  cwd,
}: {
  packageName: string
  cwd: string
}): Promise<string | null> {
  const lockPath = join(cwd, "package-lock.json")

  if (!existsSync(lockPath)) return null

  try {
    const content = await readFile(lockPath, "utf-8")
    const lock = JSON.parse(content) as {
      packages?: Record<string, { version?: string }>
      dependencies?: Record<string, { version: string }>
    }

    // npm v7+ format
    if (lock.packages) {
      const key = `node_modules/${packageName}`
      if (lock.packages[key]?.version) {
        return lock.packages[key].version
      }
    }

    // npm v6 format
    if (lock.dependencies?.[packageName]?.version) {
      return lock.dependencies[packageName].version
    }

    return null
  } catch {
    return null
  }
}

async function getVersionFromPnpmLock({
  packageName,
  cwd,
}: {
  packageName: string
  cwd: string
}): Promise<string | null> {
  const lockPath = join(cwd, "pnpm-lock.yaml")

  if (!existsSync(lockPath)) return null

  try {
    const content = await readFile(lockPath, "utf-8")
    const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`['"]?${escapedName}@([^(':"\\s)]+)`, "g")
    const matches = [...content.matchAll(regex)]

    if (matches.length > 0) {
      return matches[0][1]
    }

    return null
  } catch {
    return null
  }
}

async function getVersionFromYarnLock({
  packageName,
  cwd,
}: {
  packageName: string
  cwd: string
}): Promise<string | null> {
  const lockPath = join(cwd, "yarn.lock")

  if (!existsSync(lockPath)) return null

  try {
    const content = await readFile(lockPath, "utf-8")
    const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // yarn.lock format: "pkg@^1.0.0":\n  version "1.2.3"
    const regex = new RegExp(
      `"?${escapedName}@[^"\\n]+[":]?:?\\s*\\n\\s*version\\s+["']?([^"'\\n]+)`,
      "g"
    )
    const matches = [...content.matchAll(regex)]

    if (matches.length > 0) {
      return matches[0][1]
    }

    return null
  } catch {
    return null
  }
}

async function getVersionFromBunLock({
  packageName,
  cwd,
}: {
  packageName: string
  cwd: string
}): Promise<string | null> {
  const lockPath = join(cwd, "bun.lock")

  if (!existsSync(lockPath)) return null

  try {
    const content = await readFile(lockPath, "utf-8")
    // bun.lock format: ["packageName@version", ...]
    // or in packages section: "packageName": ["packageName@version", ...]
    const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`"${escapedName}@([^"]+)"`, "g")
    const matches = [...content.matchAll(regex)]

    if (matches.length > 0) {
      // version might be like "1.0.0" or "npm:1.0.0"
      const version = matches[0][1]
      return version.replace(/^npm:/, "")
    }

    return null
  } catch {
    return null
  }
}

async function getVersionFromPackageJson({
  packageName,
  cwd,
}: {
  packageName: string
  cwd: string
}): Promise<string | null> {
  const packageJsonPath = join(cwd, "package.json")

  if (!existsSync(packageJsonPath)) return null

  try {
    const content = await readFile(packageJsonPath, "utf-8")
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }

    const version =
      pkg.dependencies?.[packageName] ||
      pkg.devDependencies?.[packageName] ||
      pkg.peerDependencies?.[packageName]

    if (version) {
      return stripVersionPrefix(version)
    }

    return null
  } catch {
    return null
  }
}

export async function detectInstalledVersion({
  packageName,
  cwd = process.cwd(),
}: {
  packageName: string
  cwd?: string
}): Promise<string | null> {
  // 1. node_modules (most accurate)
  const nodeModulesVersion = await getVersionFromNodeModules({
    packageName,
    cwd,
  })
  if (nodeModulesVersion) return nodeModulesVersion

  // 2. lockfiles
  const packageLockVersion = await getVersionFromPackageLock({
    packageName,
    cwd,
  })
  if (packageLockVersion) return packageLockVersion

  const bunLockVersion = await getVersionFromBunLock({ packageName, cwd })
  if (bunLockVersion) return bunLockVersion

  const pnpmLockVersion = await getVersionFromPnpmLock({ packageName, cwd })
  if (pnpmLockVersion) return pnpmLockVersion

  const yarnLockVersion = await getVersionFromYarnLock({ packageName, cwd })
  if (yarnLockVersion) return yarnLockVersion

  // 3. package.json fallback
  const packageJsonVersion = await getVersionFromPackageJson({
    packageName,
    cwd,
  })
  if (packageJsonVersion) return packageJsonVersion

  return null
}
