import { useState, useEffect, useRef } from 'react';

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const lastKeyRef = useRef(key);

  useEffect(() => {
    if (lastKeyRef.current !== key) {
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
        lastKeyRef.current = key;
      } catch (error) {
        console.error(error);
        setStoredValue(initialValue);
        lastKeyRef.current = key;
      }
    } else {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error(error);
      }
    }
  }, [key, storedValue, initialValue]);

  const setValue = (value) => {
    try {
      setStoredValue((prevValue) => {
        return value instanceof Function ? value(prevValue) : value;
      });
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};
