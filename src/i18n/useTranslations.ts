import { useTranslation } from 'react-i18next';

export function useTranslations(namespace: string) {
  const { t } = useTranslation();
  return (key: string, params?: Record<string, string | number>) =>
    t(`${namespace}.${key}`, params ?? {});
}
