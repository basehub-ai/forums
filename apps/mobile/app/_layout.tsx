import { Stack } from "expo-router"
import { authClient } from "../lib/auth-client"

export default function RootLayout() {
	const { data: session, isPending } = authClient.useSession()
	const isLoggedIn = !!session?.user

	if (isPending) {
		return null
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Protected guard={!isLoggedIn}>
				<Stack.Screen name="login" />
			</Stack.Protected>
			<Stack.Protected guard={isLoggedIn}>
				<Stack.Screen name="index" />
			</Stack.Protected>
		</Stack>
	)
}
