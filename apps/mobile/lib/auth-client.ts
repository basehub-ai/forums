import { expoClient } from "@better-auth/expo/client"
import { createAuthClient } from "better-auth/react"
import * as SecureStore from "expo-secure-store"

export const authClient = createAuthClient({
  baseURL: "https://forums.basehub.com",
  plugins: [
    expoClient({
      scheme: "forums",
      storagePrefix: "forums",
      storage: SecureStore,
    }),
  ],
})
