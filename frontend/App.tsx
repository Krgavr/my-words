import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";

type HealthResponse = {
  status: string;
  app: string;
};

export default function App() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;

        if (!apiUrl) {
          setError("API URL is not configured");
          return;
        }

        const response = await fetch(`${apiUrl}/health`);

        if (!response.ok) {
          setError("Backend returned an error");
          return;
        }

        const result: HealthResponse = await response.json();
        setData(result);
      } catch {
        setError("Cannot connect to backend");
      }
    };

    checkBackend();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>My Words</Text>
        <Text style={styles.subtitle}>Vocabulary learning app</Text>

        {!data && !error && (
          <View style={styles.statusBox}>
            <ActivityIndicator />
            <Text style={styles.statusText}>Checking backend...</Text>
          </View>
        )}

        {data && (
          <View style={styles.statusBox}>
            <Text style={styles.success}>Backend status: {data.status}</Text>
            <Text style={styles.statusText}>{data.app}</Text>
          </View>
        )}

        {error && (
          <View style={styles.statusBox}>
            <Text style={styles.error}>{error}</Text>
            <Text style={styles.statusText}>
              Check that Docker and FastAPI are running.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
  },
  statusBox: {
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    color: "#444",
    textAlign: "center",
  },
  success: {
    fontSize: 20,
    fontWeight: "600",
    color: "green",
  },
  error: {
    fontSize: 20,
    fontWeight: "600",
    color: "red",
    textAlign: "center",
  },
});