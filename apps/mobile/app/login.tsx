import { Pressable, StyleSheet, Text, View } from "react-native"
import { authClient } from "../lib/auth-client"

export default function LoginScreen() {
  const handleLogin = async () => {
    try {
      await authClient.signIn.social({ provider: "github", callbackURL: "/" })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Pressable onPress={handleLogin} style={styles.button}>
        <Text style={styles.buttonText}>Sign in with GitHub</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#24292e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
