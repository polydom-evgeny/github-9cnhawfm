import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, X } from 'lucide-react';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { ParsingLoader } from './ParsingLoader';
import { createDemoAgent } from '@/lib/api/demoAgent';
import { parsePropertyInfo } from '@/lib/api/propertyParser';
import { AIReceptionistCard } from './AIReceptionistCard';
import { ErrorBanner } from './ErrorBanner';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Button } from './ui/button';
import { ANONYMOUS_USER } from '@/lib/constants/user';

export function LandingPage() {
  const { t } = useTranslation();
  const { selectedPlace, error, clearSelection } = usePlacesAutocomplete();
  const [isParsing, setIsParsing] = useState(false);
  const [hasStartedParsing, setHasStartedParsing] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parserResult, setParserResult] = useState<any>(null);
  const [agentId, setAgentId] = useState<string>('');
  const [processingError, setProcessingError] = useState(false);
  const [errorContext, setErrorContext] = useState<
    'parsing' | 'agentCreation' | null
  >(null);
  const [agentCreationStarted, setAgentCreationStarted] = useState(false);

  const createAgent = async () => {
    try {
      setErrorContext(null);

      if (!parserResult || !selectedPlace) {
        setProcessingError(true);
        setErrorContext('agentCreation');
        return;
      }

      const response = await createDemoAgent({
        client_data: {
          ...ANONYMOUS_USER,
          business_name: selectedPlace.name,
          business_address: selectedPlace.formatted_address,
        },
        property_data: parserResult,
        property_type: 'hotel',
      });

      if (!response || !response.agent || !response.agent.phone) {
        throw new Error('Invalid response from agent creation API');
      }

      setAgentId(response.agent.id);
      setIsSettingUp(false);
      setSetupComplete(true);
      setProcessingError(false);
      setErrorContext(null);
    } catch (error) {
      console.error('Error creating agent:', error);
      setIsSettingUp(false);
      setSetupComplete(false);
      setProcessingError(true);
      setErrorContext('agentCreation');
      setAgentCreationStarted(false);
    }
  };

  useEffect(() => {
    if (parserResult && !agentCreationStarted) {
      setAgentCreationStarted(true);
      setIsSettingUp(true);
      createAgent();
    }
  }, [parserResult, agentCreationStarted]);

  const handleFindProperty = async () => {
    if (!selectedPlace) return;

    setProcessingError(false);
    setErrorContext(null);
    setParsingProgress(0);
    setHasStartedParsing(true);
    setIsParsing(true);
    setParserResult(null);
    setAgentCreationStarted(false);

    try {
      await parsePropertyInfo(selectedPlace, {
        onProgress: setParsingProgress,
        onSemiResult: () => {},
        onComplete: (result) => {
          setParserResult(result);
          setIsParsing(false);
        },
        onError: () => {
          setProcessingError(true);
          setErrorContext('parsing');
          setIsParsing(false);
        },
      });
    } catch (error) {
      console.error('Find property error:', error);
      setProcessingError(true);
      setErrorContext('parsing');
      setIsParsing(false);
    }
  };

  const handleRetry = () => {
    if (errorContext === 'parsing') {
      handleFindProperty();
    } else if (errorContext === 'agentCreation' && parserResult) {
      setProcessingError(false);
      setIsSettingUp(true);
      setAgentCreationStarted(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-4 md:pt-2">
      <div className="flex h-12 md:h-14 items-center justify-between px-4 md:px-6">
        <a href="/" className="flex items-center">
          <img
            className="h-6 md:h-8 lg:h-10 w-auto"
            alt="Polydom Logo"
            src="https://unicorn-images.b-cdn.net/a07693f5-fe0a-4d8b-9021-09fa66e8f68a?optimizer=gif"
          />
        </a>
        <LanguageSwitcher />
      </div>

      <div className="max-w-[520px] mx-auto px-6 py-12">
        {!setupComplete && !isParsing && !isSettingUp && (
          <div className="text-center space-y-4">
            <h1 className="text-[32px] font-bold leading-tight">
              {t('landing.title.meet')}
            </h1>
            <p className="text-lg text-gray-900">
              {t('landing.title.employee')}
            </p>
          </div>
        )}

        {!setupComplete && !isParsing && !isSettingUp && (
          <div className="mt-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="search-input"
                type="text"
                placeholder={t('landing.search.placeholder')}
                className="w-full h-12 pl-11 pr-4 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {selectedPlace && (
                <button
                  onClick={clearSelection}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={t('landing.search.clear')}
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <Button
              variant="primary"
              fullWidth
              disabled={!selectedPlace || isParsing}
              onClick={handleFindProperty}
            >
              {isParsing ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('landing.search.processing')}
                </span>
              ) : (
                t('landing.search.button')
              )}
            </Button>

            <Button
              variant="outline"
              fullWidth
              onClick={() => window.open('https://cal.com/polydom/30min', '_blank')}
            >
              {t('landing.discover')}
            </Button>
          </div>
        )}

        {isParsing && (
          <div className="mt-8">
            <ParsingLoader
              progress={parsingProgress}
              isSettingUp={isSettingUp}
              isParsingComplete={!!parserResult}
            />
          </div>
        )}

        {setupComplete && selectedPlace && (
          <div className="mt-8">
            <AIReceptionistCard
              businessName={selectedPlace.name}
              state={selectedPlace.state}
              country={selectedPlace.country}
              agentId={agentId}
            />
          </div>
        )}

        {processingError && (
          <div className="mt-8">
            <ErrorBanner onRetry={handleRetry} />
          </div>
        )}
      </div>
    </div>
  );
}
