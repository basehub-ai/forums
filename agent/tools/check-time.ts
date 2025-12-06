export async function checkTimeStep() {
  "use step"
  await new Promise((resolve) => setTimeout(resolve, 2000))
  return { time: new Date().toISOString() }
}
