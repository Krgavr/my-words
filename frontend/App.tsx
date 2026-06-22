import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type User = {
  id: number;
  username: string;
  email: string;
  created_at: string;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
};

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');

const TOKEN_KEY = 'my_words_access_token';

async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function deleteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }

  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function getCurrentUser(token: string): Promise<User | null> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Chyba serveru: ${response.status}`);
  }

  return (await response.json()) as User;
}

export default function App() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await loadToken();

        if (!storedToken) {
          return;
        }

        const currentUser = await getCurrentUser(storedToken);

        if (!currentUser) {
          await deleteToken();
          return;
        }

        setToken(storedToken);
        setUser(currentUser);
      } catch (error) {
        console.error('Chyba při obnovení přihlášení:', error);
        await deleteToken();
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  const handleLogin = async () => {
    const normalizedLogin = login.trim();

    if (!normalizedLogin || !password) {
      setMessage('Vyplňte uživatelské jméno a heslo.');
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: normalizedLogin,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setMessage(
            'Nesprávné uživatelské jméno, e-mail nebo heslo.',
          );
        } else {
          setMessage('Přihlášení se nezdařilo.');
        }

        setIsError(true);
        return;
      }

      const loginData = data as LoginResponse;

      if (!loginData.access_token) {
        setMessage('Server nevrátil přístupový token.');
        setIsError(true);
        return;
      }

      const currentUser = await getCurrentUser(
        loginData.access_token,
      );

      if (!currentUser) {
        setMessage('Přístupový token není platný.');
        setIsError(true);
        return;
      }

      await saveToken(loginData.access_token);

      setToken(loginData.access_token);
      setUser(currentUser);
      setPassword('');
    } catch (error) {
      console.error('Chyba při přihlašování:', error);

      setMessage(
        'Nepodařilo se připojit k serveru. Zkontrolujte, zda backend běží.',
      );
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      await deleteToken();

      setToken(null);
      setUser(null);
      setLogin('');
      setPassword('');
      setMessage('');
      setIsError(false);
    } catch (error) {
      console.error('Chyba při odhlašování:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingPage}>
          <ActivityIndicator size="large" color="#4967e8" />

          <Text style={styles.loadingText}>
            Načítání aplikace...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (token && user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.homePage}>
          <View style={styles.homeContainer}>
            <View style={styles.header}>
              <Text style={styles.homeLogo}>My Words</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleLogout}
                disabled={isLoading}
              >
                <Text style={styles.logoutButtonText}>
                  Odhlásit se
                </Text>
              </Pressable>
            </View>

            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeLabel}>
                Přihlášený uživatel
              </Text>

              <Text style={styles.welcomeTitle}>
                Vítejte, {user.username}
              </Text>

              <Text style={styles.userEmail}>{user.email}</Text>
            </View>

            <View style={styles.modulesHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Vaše moduly
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Zde budou vaše vlastní sady slovíček.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => {
                  setMessage(
                    'Vytváření modulů přidáme v dalším kroku.',
                  );
                  setIsError(false);
                }}
              >
                <Text style={styles.createButtonText}>
                  Vytvořit modul
                </Text>
              </Pressable>
            </View>

            {message !== '' && (
              <Text style={styles.homeMessage}>{message}</Text>
            )}

            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>A–Z</Text>

              <Text style={styles.emptyTitle}>
                Zatím nemáte žádné moduly
              </Text>

              <Text style={styles.emptyText}>
                Vytvořte svůj první modul a přidejte do něj
                slovíčka a překlady.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.loginPage}>
          <View style={styles.loginCard}>
            <Text style={styles.logo}>My Words</Text>

            <Text style={styles.title}>Vítejte</Text>

            <Text style={styles.subtitle}>
              Přihlaste se ke svému účtu a pokračujte ve studiu
              slovíček.
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>
                  Uživatelské jméno nebo e-mail
                </Text>

                <TextInput
                  style={styles.input}
                  value={login}
                  onChangeText={setLogin}
                  placeholder="Například testuser"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Heslo</Text>

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Zadejte heslo"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  onSubmitEditing={handleLogin}
                />
              </View>

              {message !== '' && (
                <Text
                  style={[
                    styles.message,
                    isError
                      ? styles.errorMessage
                      : styles.successMessage,
                  ]}
                >
                  {message}
                </Text>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.buttonPressed,
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.loginButtonText}>
                    Přihlásit se
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>
                Nemáte účet?
              </Text>

              <Pressable
                onPress={() => {
                  setMessage(
                    'Registrační stránku přidáme později.',
                  );
                  setIsError(false);
                }}
              >
                <Text style={styles.registerLink}>
                  Zaregistrovat se
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },

  keyboardContainer: {
    flex: 1,
  },

  loadingPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 14,
    color: '#6f7688',
    fontSize: 15,
  },

  loginPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loginCard: {
    width: '100%',
    maxWidth: 420,
    padding: 32,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7eaf2',
    borderRadius: 20,
  },

  logo: {
    marginBottom: 28,
    color: '#4967e8',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },

  title: {
    color: '#202535',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 10,
    color: '#6f7688',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },

  form: {
    marginTop: 32,
  },

  field: {
    marginBottom: 20,
  },

  label: {
    marginBottom: 8,
    color: '#33394a',
    fontSize: 14,
    fontWeight: '600',
  },

  input: {
    width: '100%',
    height: 52,
    paddingHorizontal: 16,
    color: '#202535',
    backgroundColor: '#f8f9fc',
    borderWidth: 1,
    borderColor: '#dce0eb',
    borderRadius: 12,
    fontSize: 16,
  },

  message: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  errorMessage: {
    color: '#c83e4d',
  },

  successMessage: {
    color: '#27864a',
  },

  loginButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4967e8',
    borderRadius: 12,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 24,
  },

  registerText: {
    marginRight: 6,
    color: '#6f7688',
    fontSize: 14,
  },

  registerLink: {
    color: '#4967e8',
    fontSize: 14,
    fontWeight: '700',
  },

  homePage: {
    flexGrow: 1,
    padding: 24,
  },

  homeContainer: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },

  homeLogo: {
    color: '#4967e8',
    fontSize: 30,
    fontWeight: '800',
  },

  logoutButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce0eb',
    borderRadius: 12,
  },

  logoutButtonText: {
    color: '#4967e8',
    fontSize: 14,
    fontWeight: '700',
  },

  welcomeCard: {
    padding: 28,
    backgroundColor: '#4967e8',
    borderRadius: 20,
  },

  welcomeLabel: {
    marginBottom: 8,
    color: '#dfe5ff',
    fontSize: 13,
    fontWeight: '600',
  },

  welcomeTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },

  userEmail: {
    marginTop: 8,
    color: '#e9edff',
    fontSize: 15,
  },

  modulesHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 36,
  },

  sectionTitle: {
    color: '#202535',
    fontSize: 24,
    fontWeight: '800',
  },

  sectionSubtitle: {
    marginTop: 6,
    color: '#6f7688',
    fontSize: 15,
  },

  createButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    backgroundColor: '#4967e8',
    borderRadius: 12,
  },

  createButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  homeMessage: {
    marginTop: 20,
    color: '#6f7688',
    fontSize: 14,
    textAlign: 'center',
  },

  emptyCard: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7eaf2',
    borderRadius: 20,
  },

  emptyIcon: {
    marginBottom: 20,
    color: '#4967e8',
    fontSize: 30,
    fontWeight: '900',
  },

  emptyTitle: {
    color: '#202535',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyText: {
    maxWidth: 480,
    marginTop: 10,
    color: '#6f7688',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});