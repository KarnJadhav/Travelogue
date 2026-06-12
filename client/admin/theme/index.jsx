import React, { createContext, useMemo, useState, useContext } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const theme = useMemo(() => ({
    mode,
    toggle: () => setMode(m => (m === 'light' ? 'dark' : 'light')),
  }), [mode]);

  React.useEffect(() => {
    document.body.setAttribute('data-theme', mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
