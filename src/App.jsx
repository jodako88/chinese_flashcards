import { useEffect, useState } from 'react';

import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { Study } from './pages/Study';

function getCurrentRoute() {
  if (typeof window === 'undefined') {
    return 'home';
  }

  if (window.location.hash === '#/study') {
    return 'study';
  }

  if (window.location.hash === '#/settings') {
    return 'settings';
  }

  return 'home';
}

export function App() {
  const [route, setRoute] = useState(getCurrentRoute);

  useEffect(() => {
    function handleHashChange() {
      setRoute(getCurrentRoute());
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  function navigate(routeName) {
    window.location.hash = routeName === 'home' ? '/' : `/${routeName}`;
    setRoute(routeName);
  }

  if (route === 'study') {
    return <Study onDone={() => navigate('home')} />;
  }

  if (route === 'settings') {
    return <Settings onBack={() => navigate('home')} />;
  }

  return <Home onSettings={() => navigate('settings')} onStudy={() => navigate('study')} />;
}
