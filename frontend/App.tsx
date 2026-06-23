import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import {
  ActivityIndicator,
  Alert,
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

type ErrorResponse = {
  detail?: string;
};

type VocabularyModule = {
  id: number;
  user_id: number;
  name: string;
  source_language: string;
  target_language: string;
  created_at: string;
};

type ModuleData = {
  name: string;
  source_language: string;
  target_language: string;
};

type WordCard = {
  id: number;
  module_id: number;
  word: string;
  translation: string;
  is_known: boolean;
  created_at: string;
};

type WordData = {
  word: string;
  translation: string;
};

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

const TOKEN_KEY = 'my_words_access_token';

async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function deleteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }

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
    throw new Error(`Server vrátil chybu ${response.status}.`);
  }

  return (await response.json()) as User;
}

async function getModules(token: string): Promise<VocabularyModule[]> {
  const response = await fetch(`${API_URL}/modules`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Server vrátil chybu ${response.status}.`);
  }

  return (await response.json()) as VocabularyModule[];
}

async function createModuleRequest(
  token: string,
  moduleData: ModuleData,
): Promise<VocabularyModule> {
  const response = await fetch(`${API_URL}/modules`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(moduleData),
  });

  if (!response.ok) {
    throw new Error(`Server vrátil chybu ${response.status}.`);
  }

  return (await response.json()) as VocabularyModule;
}

async function updateModuleRequest(
  token: string,
  moduleId: number,
  moduleData: ModuleData,
): Promise<VocabularyModule> {
  const response = await fetch(`${API_URL}/modules/${moduleId}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(moduleData),
  });

  if (!response.ok) {
    throw new Error(`Server vrátil chybu ${response.status}.`);
  }

  return (await response.json()) as VocabularyModule;
}

async function deleteModuleRequest(
  token: string,
  moduleId: number,
): Promise<void> {
  const response = await fetch(`${API_URL}/modules/${moduleId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Server vrátil chybu ${response.status}.`);
  }
}

async function getModuleWords(
  token: string,
  moduleId: number,
): Promise<WordCard[]> {
  const response = await fetch(
    `${API_URL}/modules/${moduleId}/words`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Server vrátil chybu ${response.status}.`);
  }

  return (await response.json()) as WordCard[];
}

async function createWordRequest(
  token: string,
  moduleId: number,
  wordData: WordData,
): Promise<WordCard> {
  const response = await fetch(
    `${API_URL}/modules/${moduleId}/words`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(wordData),
    },
  );

  if (!response.ok) {
    throw new Error(`Server vrátil chybu ${response.status}.`);
  }

  return (await response.json()) as WordCard;
}

async function updateWordStatusRequest(
  token: string,
  wordId: number,
  markAsKnown: boolean,
): Promise<WordCard> {
  const statusPath = markAsKnown ? 'known' : 'unknown';

  const response = await fetch(
    `${API_URL}/words/${wordId}/${statusPath}`,
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Server vrátil chybu ${response.status}.`);
  }

  return (await response.json()) as WordCard;
}

async function deleteWordRequest(
  token: string,
  wordId: number,
): Promise<void> {
  const response = await fetch(`${API_URL}/words/${wordId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Server vrátil chybu ${response.status}.`);
  }
}

async function confirmModuleDeletion(
  module: VocabularyModule,
): Promise<boolean> {
  const confirmationText =
    `Opravdu chcete odstranit modul „${module.name}“?`;

  if (Platform.OS === 'web') {
    return window.confirm(confirmationText);
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Odstranit modul',
      confirmationText,
      [
        {
          text: 'Zrušit',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Odstranit',
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(false),
      },
    );
  });
}

async function confirmWordDeletion(
  wordCard: WordCard,
): Promise<boolean> {
  const confirmationText =
    `Opravdu chcete odstranit slovíčko „${wordCard.word}“?`;

  if (Platform.OS === 'web') {
    return window.confirm(confirmationText);
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Odstranit slovíčko',
      confirmationText,
      [
        {
          text: 'Zrušit',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Odstranit',
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(false),
      },
    );
  });
}

export default function App() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [modules, setModules] = useState<VocabularyModule[]>([]);
  const [modulesMessage, setModulesMessage] = useState('');
  const [isModulesMessageError, setIsModulesMessageError] =
    useState(false);
  const [isModulesLoading, setIsModulesLoading] = useState(false);

  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [moduleName, setModuleName] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  const [editingModuleId, setEditingModuleId] = useState<number | null>(
    null,
  );
  const [editModuleName, setEditModuleName] = useState('');
  const [editSourceLanguage, setEditSourceLanguage] = useState('');
  const [editTargetLanguage, setEditTargetLanguage] = useState('');
  const [isUpdatingModule, setIsUpdatingModule] = useState(false);
  const [deletingModuleId, setDeletingModuleId] = useState<
    number | null
  >(null);

  const [selectedModule, setSelectedModule] =
    useState<VocabularyModule | null>(null);
  const [words, setWords] = useState<WordCard[]>([]);
  const [wordsMessage, setWordsMessage] = useState('');
  const [isWordsMessageError, setIsWordsMessageError] =
    useState(false);
  const [isWordsLoading, setIsWordsLoading] = useState(false);

  const [isCreateWordFormOpen, setIsCreateWordFormOpen] =
    useState(false);
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [isCreatingWord, setIsCreatingWord] = useState(false);
  const [updatingWordId, setUpdatingWordId] = useState<number | null>(
    null,
  );
  const [deletingWordId, setDeletingWordId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await loadToken();

        if (!storedToken) {
          return;
        }

        const user = await getCurrentUser(storedToken);

        if (!user) {
          await deleteToken();
          return;
        }

        setAccessToken(storedToken);
        setCurrentUser(user);
        setIsModulesLoading(true);

        try {
          const userModules = await getModules(storedToken);
          setModules(userModules);
        } catch (error) {
          console.error('Chyba při načítání modulů:', error);
          setModulesMessage('Moduly se nepodařilo načíst.');
          setIsModulesMessageError(true);
        } finally {
          setIsModulesLoading(false);
        }
      } catch (error) {
        console.error('Chyba při obnovení přihlášení:', error);
        await deleteToken();
      } finally {
        setIsInitializing(false);
      }
    };

    void restoreSession();
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

      const data = (await response.json()) as
        | LoginResponse
        | ErrorResponse;

      if (!response.ok) {
        if (response.status === 401) {
          setMessage(
            'Nesprávné uživatelské jméno, e-mail nebo heslo.',
          );
        } else {
          setMessage(
            'Přihlášení se nezdařilo. Zkuste to prosím znovu.',
          );
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

      const user = await getCurrentUser(loginData.access_token);

      if (!user) {
        setMessage(
          'Přístupový token není platný. Přihlaste se znovu.',
        );
        setIsError(true);
        return;
      }

      await saveToken(loginData.access_token);

      setAccessToken(loginData.access_token);
      setCurrentUser(user);
      setPassword('');
      setMessage('');
      setIsModulesLoading(true);
      setModulesMessage('');

      try {
        const userModules = await getModules(loginData.access_token);
        setModules(userModules);
      } catch (error) {
        console.error('Chyba při načítání modulů:', error);
        setModulesMessage('Moduly se nepodařilo načíst.');
        setIsModulesMessageError(true);
      } finally {
        setIsModulesLoading(false);
      }
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

      setAccessToken(null);
      setCurrentUser(null);
      setModules([]);
      setSelectedModule(null);
      setWords([]);

      setLogin('');
      setPassword('');
      setMessage('');
      setModulesMessage('');
      setWordsMessage('');

      setModuleName('');
      setSourceLanguage('');
      setTargetLanguage('');
      setEditModuleName('');
      setEditSourceLanguage('');
      setEditTargetLanguage('');
      setNewWord('');
      setNewTranslation('');

      setIsCreateFormOpen(false);
      setIsCreateWordFormOpen(false);
      setEditingModuleId(null);
      setDeletingModuleId(null);
      setUpdatingWordId(null);
      setDeletingWordId(null);

      setIsError(false);
      setIsModulesMessageError(false);
      setIsWordsMessageError(false);
    } catch (error) {
      console.error('Chyba při odhlašování:', error);
      setModulesMessage('Odhlášení se nezdařilo.');
      setIsModulesMessageError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    setMessage('Registrační stránku přidáme později.');
    setIsError(false);
  };

  const handleOpenCreateForm = () => {
    setEditingModuleId(null);
    setEditModuleName('');
    setEditSourceLanguage('');
    setEditTargetLanguage('');
    setIsCreateFormOpen(true);
    setModulesMessage('');
    setIsModulesMessageError(false);
  };

  const handleCancelCreate = () => {
    setIsCreateFormOpen(false);
    setModuleName('');
    setSourceLanguage('');
    setTargetLanguage('');
    setModulesMessage('');
    setIsModulesMessageError(false);
  };

  const handleCreateModule = async () => {
    if (!accessToken) {
      setModulesMessage(
        'Pro vytvoření modulu se musíte přihlásit.',
      );
      setIsModulesMessageError(true);
      return;
    }

    const normalizedName = moduleName.trim();
    const normalizedSourceLanguage = sourceLanguage.trim();
    const normalizedTargetLanguage = targetLanguage.trim();

    if (
      !normalizedName ||
      !normalizedSourceLanguage ||
      !normalizedTargetLanguage
    ) {
      setModulesMessage('Vyplňte název modulu a oba jazyky.');
      setIsModulesMessageError(true);
      return;
    }

    setIsCreatingModule(true);
    setModulesMessage('');
    setIsModulesMessageError(false);

    try {
      const newModule = await createModuleRequest(accessToken, {
        name: normalizedName,
        source_language: normalizedSourceLanguage,
        target_language: normalizedTargetLanguage,
      });

      setModules((currentModules) => [newModule, ...currentModules]);
      setModuleName('');
      setSourceLanguage('');
      setTargetLanguage('');
      setIsCreateFormOpen(false);
      setModulesMessage('Modul byl úspěšně vytvořen.');
      setIsModulesMessageError(false);
    } catch (error) {
      console.error('Chyba při vytváření modulu:', error);
      setModulesMessage('Modul se nepodařilo vytvořit.');
      setIsModulesMessageError(true);
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleOpenEditForm = (module: VocabularyModule) => {
    setIsCreateFormOpen(false);
    setModuleName('');
    setSourceLanguage('');
    setTargetLanguage('');
    setEditingModuleId(module.id);
    setEditModuleName(module.name);
    setEditSourceLanguage(module.source_language);
    setEditTargetLanguage(module.target_language);
    setModulesMessage('');
    setIsModulesMessageError(false);
  };

  const handleCancelEdit = () => {
    setEditingModuleId(null);
    setEditModuleName('');
    setEditSourceLanguage('');
    setEditTargetLanguage('');
    setModulesMessage('');
    setIsModulesMessageError(false);
  };

  const handleUpdateModule = async () => {
    if (!accessToken || editingModuleId === null) {
      setModulesMessage('Pro úpravu modulu se musíte přihlásit.');
      setIsModulesMessageError(true);
      return;
    }

    const normalizedName = editModuleName.trim();
    const normalizedSourceLanguage = editSourceLanguage.trim();
    const normalizedTargetLanguage = editTargetLanguage.trim();

    if (
      !normalizedName ||
      !normalizedSourceLanguage ||
      !normalizedTargetLanguage
    ) {
      setModulesMessage('Vyplňte název modulu a oba jazyky.');
      setIsModulesMessageError(true);
      return;
    }

    setIsUpdatingModule(true);
    setModulesMessage('');
    setIsModulesMessageError(false);

    try {
      const updatedModule = await updateModuleRequest(
        accessToken,
        editingModuleId,
        {
          name: normalizedName,
          source_language: normalizedSourceLanguage,
          target_language: normalizedTargetLanguage,
        },
      );

      setModules((currentModules) =>
        currentModules.map((module) =>
          module.id === updatedModule.id ? updatedModule : module,
        ),
      );

      setEditingModuleId(null);
      setEditModuleName('');
      setEditSourceLanguage('');
      setEditTargetLanguage('');
      setModulesMessage('Změny modulu byly úspěšně uloženy.');
      setIsModulesMessageError(false);
    } catch (error) {
      console.error('Chyba při úpravě modulu:', error);
      setModulesMessage('Změny modulu se nepodařilo uložit.');
      setIsModulesMessageError(true);
    } finally {
      setIsUpdatingModule(false);
    }
  };

  const handleDeleteModule = async (module: VocabularyModule) => {
    if (!accessToken) {
      setModulesMessage(
        'Pro odstranění modulu se musíte přihlásit.',
      );
      setIsModulesMessageError(true);
      return;
    }

    const isConfirmed = await confirmModuleDeletion(module);

    if (!isConfirmed) {
      return;
    }

    setDeletingModuleId(module.id);
    setModulesMessage('');
    setIsModulesMessageError(false);

    try {
      await deleteModuleRequest(accessToken, module.id);

      setModules((currentModules) =>
        currentModules.filter(
          (currentModule) => currentModule.id !== module.id,
        ),
      );

      if (editingModuleId === module.id) {
        setEditingModuleId(null);
        setEditModuleName('');
        setEditSourceLanguage('');
        setEditTargetLanguage('');
      }

      setModulesMessage(
        `Modul „${module.name}“ byl úspěšně odstraněn.`,
      );
      setIsModulesMessageError(false);
    } catch (error) {
      console.error('Chyba při odstraňování modulu:', error);
      setModulesMessage(
        `Modul „${module.name}“ se nepodařilo odstranit.`,
      );
      setIsModulesMessageError(true);
    } finally {
      setDeletingModuleId(null);
    }
  };

  const handleOpenModule = async (module: VocabularyModule) => {
    if (!accessToken) {
      setModulesMessage('Pro otevření modulu se musíte přihlásit.');
      setIsModulesMessageError(true);
      return;
    }

    setSelectedModule(module);
    setWords([]);
    setIsCreateWordFormOpen(false);
    setNewWord('');
    setNewTranslation('');
    setWordsMessage('');
    setIsWordsMessageError(false);
    setIsWordsLoading(true);

    try {
      const moduleWords = await getModuleWords(accessToken, module.id);
      setWords(moduleWords);
    } catch (error) {
      console.error('Chyba při načítání slovíček:', error);
      setWordsMessage('Slovíčka se nepodařilo načíst.');
      setIsWordsMessageError(true);
    } finally {
      setIsWordsLoading(false);
    }
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setWords([]);
    setIsCreateWordFormOpen(false);
    setNewWord('');
    setNewTranslation('');
    setWordsMessage('');
    setIsWordsMessageError(false);
    setUpdatingWordId(null);
    setDeletingWordId(null);
  };

  const handleOpenCreateWordForm = () => {
    setIsCreateWordFormOpen(true);
    setWordsMessage('');
    setIsWordsMessageError(false);
  };

  const handleCancelCreateWord = () => {
    setIsCreateWordFormOpen(false);
    setNewWord('');
    setNewTranslation('');
    setWordsMessage('');
    setIsWordsMessageError(false);
  };

  const handleCreateWord = async () => {
    if (!accessToken || !selectedModule) {
      setWordsMessage(
        'Pro vytvoření slovíčka se musíte přihlásit.',
      );
      setIsWordsMessageError(true);
      return;
    }

    const normalizedWord = newWord.trim();
    const normalizedTranslation = newTranslation.trim();

    if (!normalizedWord || !normalizedTranslation) {
      setWordsMessage('Vyplňte slovíčko i jeho překlad.');
      setIsWordsMessageError(true);
      return;
    }

    setIsCreatingWord(true);
    setWordsMessage('');
    setIsWordsMessageError(false);

    try {
      const createdWord = await createWordRequest(
        accessToken,
        selectedModule.id,
        {
          word: normalizedWord,
          translation: normalizedTranslation,
        },
      );

      setWords((currentWords) => [createdWord, ...currentWords]);
      setNewWord('');
      setNewTranslation('');
      setIsCreateWordFormOpen(false);
      setWordsMessage('');
      setIsWordsMessageError(false);
    } catch (error) {
      console.error('Chyba při vytváření slovíčka:', error);
      setWordsMessage('Slovíčko se nepodařilo přidat.');
      setIsWordsMessageError(true);
    } finally {
      setIsCreatingWord(false);
    }
  };

  const handleToggleWordStatus = async (wordCard: WordCard) => {
    if (!accessToken) {
      setWordsMessage(
        'Pro změnu stavu slovíčka se musíte přihlásit.',
      );
      setIsWordsMessageError(true);
      return;
    }

    const markAsKnown = !wordCard.is_known;

    setUpdatingWordId(wordCard.id);
    setWordsMessage('');
    setIsWordsMessageError(false);

    try {
      const updatedWord = await updateWordStatusRequest(
        accessToken,
        wordCard.id,
        markAsKnown,
      );

      setWords((currentWords) =>
        currentWords.map((currentWord) =>
          currentWord.id === updatedWord.id
            ? updatedWord
            : currentWord,
        ),
      );

      setWordsMessage('');
      setIsWordsMessageError(false);
    } catch (error) {
      console.error('Chyba při změně stavu slovíčka:', error);
      setWordsMessage('Stav slovíčka se nepodařilo změnit.');
      setIsWordsMessageError(true);
    } finally {
      setUpdatingWordId(null);
    }
  };

  const handleDeleteWord = async (wordCard: WordCard) => {
    if (!accessToken) {
      setWordsMessage(
        'Pro odstranění slovíčka se musíte přihlásit.',
      );
      setIsWordsMessageError(true);
      return;
    }

    const isConfirmed = await confirmWordDeletion(wordCard);

    if (!isConfirmed) {
      return;
    }

    setDeletingWordId(wordCard.id);
    setWordsMessage('');
    setIsWordsMessageError(false);

    try {
      await deleteWordRequest(accessToken, wordCard.id);

      setWords((currentWords) =>
        currentWords.filter(
          (currentWord) => currentWord.id !== wordCard.id,
        ),
      );

      setWordsMessage('');
      setIsWordsMessageError(false);
    } catch (error) {
      console.error('Chyba při odstraňování slovíčka:', error);
      setWordsMessage('Slovíčko se nepodařilo odstranit.');
      setIsWordsMessageError(true);
    } finally {
      setDeletingWordId(null);
    }
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingPage}>
          <ActivityIndicator size="large" color="#4967e8" />
          <Text style={styles.loadingText}>Načítání aplikace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (accessToken && currentUser && selectedModule) {
    const knownWordsCount = words.filter(
      (wordCard) => wordCard.is_known,
    ).length;

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.homePage}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.homeContainer}>
            <View style={styles.header}>
              <Text style={styles.homeLogo}>My Words</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.buttonPressed,
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#4967e8" />
                ) : (
                  <Text style={styles.logoutButtonText}>
                    Odhlásit se
                  </Text>
                )}
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleBackToModules}
            >
              <Text style={styles.backButtonText}>← Zpět na moduly</Text>
            </Pressable>

            <View style={styles.moduleDetailCard}>
              <Text style={styles.moduleDetailLabel}>Vybraný modul</Text>
              <Text style={styles.moduleDetailTitle}>
                {selectedModule.name}
              </Text>
              <Text style={styles.moduleDetailLanguages}>
                {selectedModule.source_language}
                {' → '}
                {selectedModule.target_language}
              </Text>

              <View style={styles.moduleStatistics}>
                <View style={styles.statisticItem}>
                  <Text style={styles.statisticValue}>{words.length}</Text>
                  <Text style={styles.statisticLabel}>Celkem slov</Text>
                </View>

                <View style={styles.statisticItem}>
                  <Text style={styles.statisticValue}>
                    {knownWordsCount}
                  </Text>
                  <Text style={styles.statisticLabel}>Známých</Text>
                </View>

                <View style={styles.statisticItem}>
                  <Text style={styles.statisticValue}>
                    {words.length - knownWordsCount}
                  </Text>
                  <Text style={styles.statisticLabel}>Neznámých</Text>
                </View>
              </View>
            </View>

            <View style={styles.wordsHeader}>
              <View style={styles.wordsTitleContainer}>
                <Text style={styles.sectionTitle}>Slovíčka</Text>
                <Text style={styles.sectionSubtitle}>
                  Přidejte slovíčka a jejich překlady.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.buttonPressed,
                  isCreateWordFormOpen && styles.disabledButton,
                ]}
                onPress={handleOpenCreateWordForm}
                disabled={isCreateWordFormOpen}
              >
                <Text style={styles.createButtonText}>
                  Přidat slovíčko
                </Text>
              </Pressable>
            </View>

            {isCreateWordFormOpen && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Nové slovíčko</Text>
                <Text style={styles.formCardDescription}>
                  Zadejte slovíčko a jeho překlad.
                </Text>

                <View style={styles.formCardFields}>
                  <View style={styles.wordsFormRow}>
                    <View style={styles.wordFormField}>
                      <Text style={styles.label}>
                        Slovíčko ({selectedModule.source_language})
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={newWord}
                        onChangeText={setNewWord}
                        placeholder="Například house"
                        editable={!isCreatingWord}
                        maxLength={255}
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.wordFormField}>
                      <Text style={styles.label}>
                        Překlad ({selectedModule.target_language})
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={newTranslation}
                        onChangeText={setNewTranslation}
                        placeholder="Například dům"
                        editable={!isCreatingWord}
                        maxLength={255}
                        onSubmitEditing={handleCreateWord}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.formButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleCancelCreateWord}
                    disabled={isCreatingWord}
                  >
                    <Text style={styles.cancelButtonText}>Zrušit</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.submitButton,
                      pressed && styles.buttonPressed,
                      isCreatingWord && styles.disabledButton,
                    ]}
                    onPress={handleCreateWord}
                    disabled={isCreatingWord}
                  >
                    {isCreatingWord ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Přidat</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {wordsMessage !== '' && (
              <Text
                style={[
                  styles.wordsMessage,
                  isWordsMessageError
                    ? styles.errorMessage
                    : styles.successMessage,
                ]}
              >
                {wordsMessage}
              </Text>
            )}

            {isWordsLoading ? (
              <View style={styles.modulesLoading}>
                <ActivityIndicator size="large" color="#4967e8" />
                <Text style={styles.loadingText}>
                  Načítání slovíček...
                </Text>
              </View>
            ) : words.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>A–Z</Text>
                <Text style={styles.emptyTitle}>
                  Modul zatím nemá žádná slovíčka
                </Text>
                <Text style={styles.emptyText}>
                  Přidejte první slovíčko a jeho překlad.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleOpenCreateWordForm}
                  disabled={isCreateWordFormOpen}
                >
                  <Text style={styles.emptyButtonText}>
                    Přidat první slovíčko
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.wordsList}>
                {words.map((wordCard) => {
                  const isUpdating = updatingWordId === wordCard.id;
                  const isDeleting = deletingWordId === wordCard.id;

                  return (
                    <View key={wordCard.id} style={styles.wordCard}>
                      <View style={styles.wordInformation}>
                        <Text style={styles.wordText}>{wordCard.word}</Text>
                        <Text style={styles.translationText}>
                          {wordCard.translation}
                        </Text>
                      </View>

                      <View style={styles.wordActions}>
                        <View
                          style={[
                            styles.statusBadge,
                            wordCard.is_known
                              ? styles.knownBadge
                              : styles.unknownBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              wordCard.is_known
                                ? styles.knownBadgeText
                                : styles.unknownBadgeText,
                            ]}
                          >
                            {wordCard.is_known ? 'Známé' : 'Neznámé'}
                          </Text>
                        </View>

                        <Pressable
                          style={({ pressed }) => [
                            styles.statusButton,
                            wordCard.is_known
                              ? styles.markUnknownButton
                              : styles.markKnownButton,
                            pressed && styles.buttonPressed,
                            isUpdating && styles.disabledButton,
                          ]}
                          onPress={() => {
                            void handleToggleWordStatus(wordCard);
                          }}
                          disabled={
                            isUpdating ||
                            isDeleting ||
                            updatingWordId !== null ||
                            deletingWordId !== null
                          }
                        >
                          {isUpdating ? (
                            <ActivityIndicator
                              size="small"
                              color={
                                wordCard.is_known ? '#9a661f' : '#27864a'
                              }
                            />
                          ) : (
                            <Text
                              style={[
                                styles.statusButtonText,
                                wordCard.is_known
                                  ? styles.markUnknownButtonText
                                  : styles.markKnownButtonText,
                              ]}
                            >
                              {wordCard.is_known
                                ? 'Označit jako neznámé'
                                : 'Označit jako známé'}
                            </Text>
                          )}
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.wordDeleteButton,
                            pressed && styles.buttonPressed,
                            isDeleting && styles.disabledButton,
                          ]}
                          onPress={() => {
                            void handleDeleteWord(wordCard);
                          }}
                          disabled={
                            isDeleting ||
                            isUpdating ||
                            deletingWordId !== null ||
                            updatingWordId !== null
                          }
                        >
                          {isDeleting ? (
                            <ActivityIndicator
                              size="small"
                              color="#c83e4d"
                            />
                          ) : (
                            <Text style={styles.wordDeleteButtonText}>
                              Smazat
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (accessToken && currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.homePage}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.homeContainer}>
            <View style={styles.header}>
              <Text style={styles.homeLogo}>My Words</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.buttonPressed,
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#4967e8" />
                ) : (
                  <Text style={styles.logoutButtonText}>
                    Odhlásit se
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeLabel}>Přihlášený uživatel</Text>
              <Text style={styles.welcomeTitle}>
                Vítejte, {currentUser.username}
              </Text>
              <Text style={styles.userEmail}>{currentUser.email}</Text>
            </View>

            <View style={styles.modulesHeader}>
              <View style={styles.modulesTitleContainer}>
                <Text style={styles.sectionTitle}>Vaše moduly</Text>
                <Text style={styles.sectionSubtitle}>
                  Vlastní sady slovíček a překladů.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.buttonPressed,
                  isCreateFormOpen && styles.disabledButton,
                ]}
                onPress={handleOpenCreateForm}
                disabled={isCreateFormOpen}
              >
                <Text style={styles.createButtonText}>Vytvořit modul</Text>
              </Pressable>
            </View>

            {isCreateFormOpen && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Nový modul</Text>
                <Text style={styles.formCardDescription}>
                  Zadejte název modulu a jazykovou kombinaci.
                </Text>

                <View style={styles.formCardFields}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Název modulu</Text>
                    <TextInput
                      style={styles.input}
                      value={moduleName}
                      onChangeText={setModuleName}
                      placeholder="Například Lecture 2"
                      editable={!isCreatingModule}
                      maxLength={100}
                    />
                  </View>

                  <View style={styles.languagesRow}>
                    <View style={styles.languageField}>
                      <Text style={styles.label}>Výchozí jazyk</Text>
                      <TextInput
                        style={styles.input}
                        value={sourceLanguage}
                        onChangeText={setSourceLanguage}
                        placeholder="Například English"
                        editable={!isCreatingModule}
                        maxLength={50}
                      />
                    </View>

                    <View style={styles.languageField}>
                      <Text style={styles.label}>Cílový jazyk</Text>
                      <TextInput
                        style={styles.input}
                        value={targetLanguage}
                        onChangeText={setTargetLanguage}
                        placeholder="Například Czech"
                        editable={!isCreatingModule}
                        maxLength={50}
                        onSubmitEditing={handleCreateModule}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.formButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleCancelCreate}
                    disabled={isCreatingModule}
                  >
                    <Text style={styles.cancelButtonText}>Zrušit</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.submitButton,
                      pressed && styles.buttonPressed,
                      isCreatingModule && styles.disabledButton,
                    ]}
                    onPress={handleCreateModule}
                    disabled={isCreatingModule}
                  >
                    {isCreatingModule ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Vytvořit</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {editingModuleId !== null && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Upravit modul</Text>
                <Text style={styles.formCardDescription}>
                  Změňte název modulu nebo jazykovou kombinaci.
                </Text>

                <View style={styles.formCardFields}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Název modulu</Text>
                    <TextInput
                      style={styles.input}
                      value={editModuleName}
                      onChangeText={setEditModuleName}
                      placeholder="Název modulu"
                      editable={!isUpdatingModule}
                      maxLength={100}
                    />
                  </View>

                  <View style={styles.languagesRow}>
                    <View style={styles.languageField}>
                      <Text style={styles.label}>Výchozí jazyk</Text>
                      <TextInput
                        style={styles.input}
                        value={editSourceLanguage}
                        onChangeText={setEditSourceLanguage}
                        placeholder="Výchozí jazyk"
                        editable={!isUpdatingModule}
                        maxLength={50}
                      />
                    </View>

                    <View style={styles.languageField}>
                      <Text style={styles.label}>Cílový jazyk</Text>
                      <TextInput
                        style={styles.input}
                        value={editTargetLanguage}
                        onChangeText={setEditTargetLanguage}
                        placeholder="Cílový jazyk"
                        editable={!isUpdatingModule}
                        maxLength={50}
                        onSubmitEditing={handleUpdateModule}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.formButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleCancelEdit}
                    disabled={isUpdatingModule}
                  >
                    <Text style={styles.cancelButtonText}>Zrušit</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.submitButton,
                      pressed && styles.buttonPressed,
                      isUpdatingModule && styles.disabledButton,
                    ]}
                    onPress={handleUpdateModule}
                    disabled={isUpdatingModule}
                  >
                    {isUpdatingModule ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        Uložit změny
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {modulesMessage !== '' && (
              <Text
                style={[
                  styles.modulesMessage,
                  isModulesMessageError
                    ? styles.errorMessage
                    : styles.successMessage,
                ]}
              >
                {modulesMessage}
              </Text>
            )}

            {isModulesLoading ? (
              <View style={styles.modulesLoading}>
                <ActivityIndicator size="large" color="#4967e8" />
                <Text style={styles.loadingText}>Načítání modulů...</Text>
              </View>
            ) : modules.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>A–Z</Text>
                <Text style={styles.emptyTitle}>
                  Zatím nemáte žádné moduly
                </Text>
                <Text style={styles.emptyText}>
                  Vytvořte svůj první modul a přidejte do něj slovíčka a
                  překlady.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleOpenCreateForm}
                >
                  <Text style={styles.emptyButtonText}>
                    Vytvořit první modul
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.modulesList}>
                {modules.map((module) => {
                  const isDeleting = deletingModuleId === module.id;
                  const isEditing = editingModuleId === module.id;

                  return (
                    <View
                      key={module.id}
                      style={[
                        styles.moduleCard,
                        isEditing && styles.activeModuleCard,
                      ]}
                    >
                      <View style={styles.moduleInformation}>
                        <Text style={styles.moduleName}>{module.name}</Text>
                        <Text style={styles.languagePair}>
                          {module.source_language}
                          {' → '}
                          {module.target_language}
                        </Text>
                      </View>

                      <View style={styles.moduleActions}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.openButton,
                            pressed && styles.buttonPressed,
                          ]}
                          onPress={() => {
                            void handleOpenModule(module);
                          }}
                          disabled={isDeleting || isUpdatingModule}
                        >
                          <Text style={styles.openButtonText}>Otevřít</Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.editButton,
                            pressed && styles.buttonPressed,
                            isEditing && styles.disabledButton,
                          ]}
                          onPress={() => handleOpenEditForm(module)}
                          disabled={
                            isDeleting || isUpdatingModule || isEditing
                          }
                        >
                          <Text style={styles.editButtonText}>Upravit</Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.deleteButton,
                            pressed && styles.buttonPressed,
                            isDeleting && styles.disabledButton,
                          ]}
                          onPress={() => {
                            void handleDeleteModule(module);
                          }}
                          disabled={isDeleting || isUpdatingModule}
                        >
                          {isDeleting ? (
                            <ActivityIndicator
                              size="small"
                              color="#c83e4d"
                            />
                          ) : (
                            <Text style={styles.deleteButtonText}>Smazat</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
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
              Přihlaste se ke svému účtu a pokračujte ve studiu slovíček.
            </Text>

            <View style={styles.loginForm}>
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
                  returnKeyType="next"
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
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              {message !== '' && (
                <Text
                  style={[
                    styles.message,
                    isError
                      ? styles.errorMessage
                      : styles.informationMessage,
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
                  <Text style={styles.loginButtonText}>Přihlásit se</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Nemáte účet?</Text>
              <Pressable onPress={handleRegister} disabled={isLoading}>
                <Text style={styles.registerLink}>Zaregistrovat se</Text>
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

  loginForm: {
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

  informationMessage: {
    color: '#4967e8',
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
    flexWrap: 'wrap',
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

  modulesTitleContainer: {
    marginRight: 20,
    marginBottom: 16,
  },

  wordsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 36,
  },

  wordsTitleContainer: {
    marginRight: 20,
    marginBottom: 16,
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
    lineHeight: 22,
  },

  createButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#4967e8',
    borderRadius: 12,
  },

  createButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  formCard: {
    marginBottom: 22,
    padding: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7eaf2',
    borderRadius: 18,
  },

  formCardTitle: {
    color: '#202535',
    fontSize: 21,
    fontWeight: '800',
  },

  formCardDescription: {
    marginTop: 7,
    color: '#6f7688',
    fontSize: 14,
    lineHeight: 21,
  },

  formCardFields: {
    marginTop: 24,
  },

  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  languageField: {
    width: '48%',
    minWidth: 240,
    flexGrow: 1,
    marginRight: 12,
    marginBottom: 4,
  },

  wordsFormRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  wordFormField: {
    width: '48%',
    minWidth: 240,
    flexGrow: 1,
    marginRight: 12,
    marginBottom: 4,
  },

  formButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginTop: 8,
  },

  cancelButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginBottom: 8,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce0eb',
    borderRadius: 11,
  },

  cancelButtonText: {
    color: '#6f7688',
    fontSize: 14,
    fontWeight: '700',
  },

  submitButton: {
    minWidth: 140,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
    backgroundColor: '#4967e8',
    borderRadius: 11,
  },

  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  modulesMessage: {
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  wordsMessage: {
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  modulesLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },

  modulesList: {
    marginTop: 8,
  },

  moduleCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7eaf2',
    borderRadius: 16,
  },

  activeModuleCard: {
    borderColor: '#4967e8',
  },

  moduleInformation: {
    flexGrow: 1,
    marginRight: 20,
    marginBottom: 8,
  },

  moduleName: {
    color: '#202535',
    fontSize: 19,
    fontWeight: '800',
  },

  languagePair: {
    marginTop: 7,
    color: '#6f7688',
    fontSize: 15,
  },

  moduleActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  openButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    paddingHorizontal: 16,
    backgroundColor: '#eef1ff',
    borderRadius: 10,
  },

  openButtonText: {
    color: '#4967e8',
    fontSize: 14,
    fontWeight: '700',
  },

  editButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f2f4f8',
    borderWidth: 1,
    borderColor: '#dce0eb',
    borderRadius: 10,
  },

  editButtonText: {
    color: '#4f5668',
    fontSize: 14,
    fontWeight: '700',
  },

  deleteButton: {
    minWidth: 82,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff0f1',
    borderWidth: 1,
    borderColor: '#f3c7cc',
    borderRadius: 10,
  },

  deleteButtonText: {
    color: '#c83e4d',
    fontSize: 14,
    fontWeight: '700',
  },

  emptyCard: {
    alignItems: 'center',
    marginTop: 12,
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

  emptyButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 22,
    backgroundColor: '#4967e8',
    borderRadius: 12,
  },

  emptyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  backButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce0eb',
    borderRadius: 10,
  },

  backButtonText: {
    color: '#4967e8',
    fontSize: 14,
    fontWeight: '700',
  },

  moduleDetailCard: {
    padding: 28,
    backgroundColor: '#4967e8',
    borderRadius: 20,
  },

  moduleDetailLabel: {
    color: '#dfe5ff',
    fontSize: 13,
    fontWeight: '600',
  },

  moduleDetailTitle: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
  },

  moduleDetailLanguages: {
    marginTop: 8,
    color: '#e9edff',
    fontSize: 16,
  },

  moduleStatistics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 28,
  },

  statisticItem: {
    minWidth: 110,
    marginRight: 32,
    marginBottom: 10,
  },

  statisticValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },

  statisticLabel: {
    marginTop: 4,
    color: '#dfe5ff',
    fontSize: 13,
  },

  wordsList: {
    marginTop: 8,
  },

  wordCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7eaf2',
    borderRadius: 16,
  },

  wordInformation: {
    flexGrow: 1,
    marginRight: 20,
    marginBottom: 8,
  },

  wordText: {
    color: '#202535',
    fontSize: 19,
    fontWeight: '800',
  },

  translationText: {
    marginTop: 7,
    color: '#6f7688',
    fontSize: 16,
  },

  wordActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  statusBadge: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 6,
    paddingHorizontal: 14,
    borderRadius: 17,
  },

  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  knownBadge: {
    backgroundColor: '#e7f7ed',
    borderWidth: 1,
    borderColor: '#b9e4c8',
  },

  knownBadgeText: {
    color: '#27864a',
  },

  unknownBadge: {
    backgroundColor: '#fff4e5',
    borderWidth: 1,
    borderColor: '#f2d4a8',
  },

  unknownBadgeText: {
    color: '#9a661f',
  },

  statusButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
  },

  statusButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },

  markKnownButton: {
    backgroundColor: '#e7f7ed',
    borderColor: '#b9e4c8',
  },

  markKnownButtonText: {
    color: '#27864a',
  },

  markUnknownButton: {
    backgroundColor: '#fff4e5',
    borderColor: '#f2d4a8',
  },

  markUnknownButtonText: {
    color: '#9a661f',
  },

  wordDeleteButton: {
    minWidth: 82,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginBottom: 6,
    paddingHorizontal: 16,
    backgroundColor: '#fff0f1',
    borderWidth: 1,
    borderColor: '#f3c7cc',
    borderRadius: 10,
  },

  wordDeleteButtonText: {
    color: '#c83e4d',
    fontSize: 13,
    fontWeight: '700',
  },
});
