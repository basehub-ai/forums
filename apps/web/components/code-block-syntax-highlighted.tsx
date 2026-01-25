import type { ThemeRegistration } from "shiki"
import { codeToHtml } from "shiki"

const theme: ThemeRegistration = {
  name: "forums",
  type: "dark",
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "var(--sh-comment)" },
    },
    {
      scope: ["string", "string.quoted"],
      settings: { foreground: "var(--sh-string)" },
    },
    {
      scope: ["keyword", "storage", "keyword.operator.expression"],
      settings: { foreground: "var(--sh-keyword)" },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: { foreground: "var(--sh-function)" },
    },
    {
      scope: ["constant", "constant.numeric", "constant.language"],
      settings: { foreground: "var(--sh-constant)" },
    },
    {
      scope: ["variable", "variable.parameter", "variable.other"],
      settings: { foreground: "var(--sh-variable)" },
    },
    {
      scope: ["punctuation"],
      settings: { foreground: "var(--sh-punctuation)" },
    },
  ],
  colors: {
    "editor.foreground": "var(--sh-foreground)",
    "editor.background": "var(--sh-background)",
  },
}

export async function CodeBlockSyntaxHighlighted({
  code,
  language,
}: {
  code: string
  language: string
}) {
  const html = await codeToHtml(code, {
    lang: language,
    theme,
  })

  return (
    <div
      className="code-block-ssr rounded border border-faint/20 bg-faint/5 [&_code]:font-mono [&_pre]:overflow-x-auto [&_pre]:p-3 [&_pre]:text-sm"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is safe
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
