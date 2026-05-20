import { useCallback, useEffect, useState } from 'react';

import { getDashboardCounts } from '../lib/db';

const INITIAL_COUNTS = {
  dueTodayCount: 0,
  newCardsCount: 0,
  suspendedCardsCount: 0,
};

export function useDashboard() {
  const [counts, setCounts] = useState(INITIAL_COUNTS);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      setCounts(await getDashboardCounts());
    } catch (dashboardError) {
      setError(dashboardError.message || 'Unable to load dashboard counts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  return {
    counts,
    error,
    isLoading,
    refreshDashboard,
  };
}
