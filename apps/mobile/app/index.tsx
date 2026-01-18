import { StyleSheet, Text, View } from "react-native"
import { authClient } from "../lib/auth-client"

export default function HomeScreen() {
  const { data: session } = authClient.useSession()

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome, {session?.user?.name}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 20,
  },
})
