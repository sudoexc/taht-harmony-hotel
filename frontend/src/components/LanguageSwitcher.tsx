import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 rounded-md border bg-muted/50 p-0.5">
      <Button
        variant={language === 'ru' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('ru')}
        className="text-xs px-2.5 h-7"
      >
        {t.common.langRuShort}
      </Button>
      <Button
        variant={language === 'uz' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('uz')}
        className="text-xs px-2.5 h-7"
      >
        {t.common.langUzShort}
      </Button>
    </div>
  );
}
