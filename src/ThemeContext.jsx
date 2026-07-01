import React, { createContext, useContext, useState, useEffect } from 'react'

export const themes = {
  light: {
    bg: '#fafafa',
    card: '#ffffff',
    text: '#111111',
    muted: '#888888',
    border: '#e5e5e5',
    itemBg: '#f5f5f3',
    inputBg: '#ffffff',
    inputBorder: '#dddddd',
  },
  dark: {
    bg: '#121212',
    card: '#1e1e1e',
    text: '#eeeeee',
    muted: '#aaaaaa',
    border: '#333333',
    itemBg: '#2a2a2a',
    inputBg: '#2a2a2a',
    inputBorder: '#444444',
  }
}

const ThemeContext = createContext({
  isDark: false,
  theme: themes.light,
  toggle: () => {}
})

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const theme = isDark ? themes.dark : themes.light
  const toggle = () => setIsDark(!isDark)

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggle }}>
      <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', transition: 'background 0.2s, color 0.2s' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)