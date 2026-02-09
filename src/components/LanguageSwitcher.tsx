import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 rounded-md border bg-muted/50 p-0.5">
      <Button
        variant={language === 'ru' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('ru')}
        className="text-xs px-2.5 h-7"
      >
        RU
      </Button>
      <Button
        variant={language === 'uz' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('uz')}
        className="text-xs px-2.5 h-7"
      >
        UZ
      </Button>
    </div>
  );
}
