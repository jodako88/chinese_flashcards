import { useCallback, useEffect, useState } from 'react';

import {
  clearAllSentences,
  getAppSettings,
  getSuspendedCards,
  unsuspendCard,
  updateAppSettings,
} from '../lib/db';

export const DEFAULT_SETTINGS = {
  new_cards_per_day: 20,
  default_direction: 'random',
  deepseek_model: 'deepseek-chat',
};

export function useSettings({ includeSuspendedCards = false } = {}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [suspendedCards, setSuspendedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingSentences, setIsClearingSentences] = useState(false);
  const [isLoadingSuspendedCards, setIsLoadingSuspendedCards] = useState(includeSuspendedCards);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSuspendedCards = useCallback(async () => {
    if (!includeSuspendedCards) {
      return;
    }

    setIsLoadingSuspendedCards(true);

    try {
      setSuspendedCards(await getSuspendedCards());
    } catch (suspendedError) {
      setError(suspendedError.message || 'Unable to load suspended words.');
    } finally {
      setIsLoadingSuspendedCards(false);
    }
  }, [includeSuspendedCards]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      setSettings(await getAppSettings());
      await loadSuspendedCards();
    } catch (settingsError) {
      setError(settingsError.message || 'Unable to load settings.');
    } finally {
      setIsLoading(false);
    }
  }, [loadSuspendedCards]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function saveSetting(field, value) {
    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const nextSettings = await updateAppSettings({ [field]: value });
      setSettings(nextSettings);
      setMessage('Settings saved.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  }

  async function unsuspend(cardId) {
    setError('');
    setMessage('');

    try {
      await unsuspendCard(cardId);
      await loadSuspendedCards();
      setMessage('Word unsuspended.');
    } catch (unsuspendError) {
      setError(unsuspendError.message || 'Unable to unsuspend this word.');
    }
  }

  async function clearSentenceCache() {
    setIsClearingSentences(true);
    setError('');
    setMessage('');

    try {
      await clearAllSentences();
      setMessage('Cached sentences cleared. They will regenerate on demand during study.');
    } catch (clearError) {
      setError(clearError.message || 'Unable to clear cached sentences.');
    } finally {
      setIsClearingSentences(false);
    }
  }

  return {
    clearSentenceCache,
    error,
    isClearingSentences,
    isLoading,
    isLoadingSuspendedCards,
    isSaving,
    loadSettings,
    message,
    saveSetting,
    settings,
    suspendedCards,
    unsuspend,
  };
}
