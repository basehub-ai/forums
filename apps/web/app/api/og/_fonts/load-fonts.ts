const geistMonoRegular = fetch(
  new URL("./GeistMono-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer())

const geistMonoBold = fetch(
  new URL("./GeistMono-Bold.ttf", import.meta.url)
).then((res) => res.arrayBuffer())

export async function loadFonts() {
  const [fontRegular, fontBold] = await Promise.all([
    geistMonoRegular,
    geistMonoBold,
  ])

  return [
    {
      name: "Geist Mono",
      data: fontRegular,
      weight: 400 as const,
    },
    {
      name: "Geist Mono",
      data: fontBold,
      weight: 700 as const,
    },
  ]
}
