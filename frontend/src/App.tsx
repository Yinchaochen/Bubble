import React, { useCallback, useState, useEffect } from 'react';
import { Globe, ExternalLink, ChevronDown, ChevronUp, AlertCircle, Download } from 'lucide-react';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Container,
  Paper,
  Stack,
  Menu,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Capture the PWA install prompt as early as possible (fires before React mounts)
let deferredInstallPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

type LanguageCode = 'en' | 'de' | 'zh';

type Article = {
  id: number;
  title: string;
  summary: string;
  source: string;
  originalUrl: string;
  timestamp: string;
};

type Translations = {
  [key in LanguageCode]: {
    title: string;
    loading: string;
    error: string;
    readOriginal: string;
    source: string;
    selectLanguage: string;
    noNews: string;
    retry: string;
    lastUpdated: string;
    downloadDocs: string;
    comicGuide: string;
  };
};

const translations: Translations = {
  en: {
    title: 'Bubble',
    loading: 'Loading news...',
    error: 'Failed to load news',
    readOriginal: 'Read Original',
    source: 'Source',
    selectLanguage: 'Select Language',
    noNews: 'No news available at the moment',
    retry: 'Retry',
    lastUpdated: 'Last updated',
    downloadDocs: 'Install App',
    comicGuide: 'How it works',
  },
  de: {
    title: 'Bubble',
    loading: 'Nachrichten werden geladen...',
    error: 'Fehler beim Laden der Nachrichten',
    readOriginal: 'Original lesen',
    source: 'Quelle',
    selectLanguage: 'Sprache wählen',
    noNews: 'Derzeit sind keine Nachrichten verfügbar',
    retry: 'Wiederholen',
    lastUpdated: 'Zuletzt aktualisiert',
    downloadDocs: 'App installieren',
    comicGuide: 'Wie es funktioniert',
  },
  zh: {
    title: '茧房',
    loading: '正在加载新闻...',
    error: '加载新闻失败',
    readOriginal: '阅读原文',
    source: '来源',
    selectLanguage: '选择语言',
    noNews: '暂无新闻',
    retry: '重试',
    lastUpdated: '最后更新',
    downloadDocs: '安装到手机',
    comicGuide: '漫画说明',
  },
};

const NewsCard: React.FC<{
  article: Article;
  isExpanded: boolean;
  onToggle: () => void;
  language: LanguageCode;
}> = ({ article, isExpanded, onToggle, language }) => {
  const t = translations[language];

  return (
    <Paper
      elevation={2}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 4
        },
        transform: isExpanded ? 'scale(1.02)' : 'none'
      }}
      onClick={onToggle}
    >
      <Box p={4}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Typography variant="h6" component="h3" sx={{ pr: 2, fontWeight: 600, color: 'text.primary' }}>
            {article.title}
          </Typography>
          <Box color="action.active" sx={{ flexShrink: 0 }}>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Box>
        </Box>

        {isExpanded && (
          <Box sx={{ 
            '& > * + *': { mt: 3 },
            animation: 'slideIn 0.3s ease-out'
          }}>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {article.summary}
            </Typography>

            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              pt={3} 
              sx={{ borderTop: 1, borderColor: 'divider' }}
            >
              <Typography variant="body2" color="text.secondary">
                <Box component="span" fontWeight="medium">{t.source}:</Box> {article.source}
              </Typography>

              <Button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  window.open(article.originalUrl, '_blank');
                }}
                variant="contained"
                color="primary"
                size="small"
                startIcon={<ExternalLink size={16} />}
              >
                {t.readOriginal}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

const LanguageSelector: React.FC<{
  currentLanguage: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
}> = ({ currentLanguage, onLanguageChange }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
    { code: 'zh', name: '中文' },
  ];

  const currentLang = languages.find((lang) => lang.code === currentLanguage);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (code: LanguageCode) => {
    onLanguageChange(code);
    handleClose();
  };

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={handleClick}
        startIcon={<Globe size={16} />}
        endIcon={<ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
        sx={{
          textTransform: 'none',
          minWidth: 120,
          justifyContent: 'space-between'
        }}
      >
        {currentLang?.name}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code as LanguageCode)}
            selected={lang.code === currentLanguage}
          >
            {lang.name}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

const InstallButton: React.FC<{ language: LanguageCode }> = ({ language }) => {
  const [showHint, setShowHint] = useState(false);
  const t = translations[language];

  const handleInstall = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    } else {
      setShowHint(true);
    }
  };

  const hintText = language === 'zh'
    ? '在 Safari 中：点击底部「分享」→「添加到主屏幕」'
    : language === 'de'
    ? 'In Safari: Tippe „Teilen" → „Zum Home-Bildschirm"'
    : 'In Safari: Tap "Share" → "Add to Home Screen"';

  const dismissText = language === 'zh' ? '点击关闭'
    : language === 'de' ? 'Tippen zum Schließen' : 'Tap to dismiss';

  return (
    <>
      <Tooltip title={t.downloadDocs} arrow>
        <IconButton
          onClick={handleInstall}
          sx={{
            color: 'primary.main',
            border: 1,
            borderColor: 'primary.main',
            borderRadius: 1,
            '&:hover': { bgcolor: 'primary.light', color: 'white' },
            transition: 'all 0.2s ease',
          }}
        >
          <Download size={20} />
        </IconButton>
      </Tooltip>
      {showHint && (
        <Box
          onClick={() => setShowHint(false)}
          sx={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'rgba(0,0,0,0.85)',
            color: 'white',
            borderRadius: 2,
            px: 3,
            py: 2,
            zIndex: 9999,
            textAlign: 'center',
            maxWidth: 300,
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            cursor: 'pointer',
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{hintText}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.5, mt: 0.5, display: 'block' }}>
            {dismissText}
          </Typography>
        </Box>
      )}
    </>
  );
};

const LoadingSpinner = () => (
  <CircularProgress size={24} />
);

const App: React.FC = () => {
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const t = translations[language];


  //21.11.2025 -- useCallback 包裹 loadNews 函数，避免不必要的重新创建
  const loadNews = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/news`, {
        params: { lang: language },
        timeout: 10000,
      });

      if (response.data.success) {
        setNews(response.data.data || []);
        setLastUpdated(response.data.lastUpdated);
      } else {
        throw new Error(response.data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Network error';
      console.error('Error loading news:', errorMessage);
      setError(errorMessage);
    } finally {
      if (showLoading) setLoading(false);
    }
  },[language]);

  useEffect(() => {
    loadNews();
    setExpandedCard(null);
  }, [loadNews]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadNews(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNews]);

  const handleCardToggle = (cardId : number) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(
      language === 'zh' ? 'zh-CN' : language === 'de' ? 'de-DE' : 'en-US'
    );
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundImage: 'url(/background.jpg)',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center',
      bgcolor: 'background.default',
      color: 'text.primary'
    }}>
      <AppBar position="static" sx={{ 
        bgcolor: 'background.paper',
        boxShadow: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} />
              <InstallButton language={language} />
              <Tooltip title={t.comicGuide} arrow>
                <IconButton
                  onClick={() => window.open('/comic.html', '_blank')}
                  sx={{
                    color: 'primary.main',
                    border: 1,
                    borderColor: 'primary.main',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'primary.light', color: 'white' },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🫧</span>
                </IconButton>
              </Tooltip>
            </Box>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                flex: 1,
                textAlign: 'center',
                fontWeight: 'bold',
                color: 'text.primary'
              }}
            >
              {t.title}
            </Typography>
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {lastUpdated && (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t.lastUpdated}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatLastUpdated(lastUpdated)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 8, px: 4 }}>
        {loading && (
          <Box textAlign="center" py={12}>
            <Box display="inline-flex" alignItems="center" gap={2} color="text.secondary">
              <LoadingSpinner />
              <Typography variant="h6">{t.loading}</Typography>
            </Box>
          </Box>
        )}

        {error && (
          <Box textAlign="center" py={12}>
            <Paper 
              elevation={0} 
              sx={{ 
                bgcolor: 'error.light', 
                border: 1, 
                borderColor: 'error.main',
                borderRadius: 2,
                p: 6,
                maxWidth: 'md',
                mx: 'auto'
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <AlertCircle color="error" size={20} />
                <Typography color="error" fontWeight="medium">{t.error}</Typography>
              </Box>
              <Typography color="error" variant="body2" mb={4}>{error}</Typography>
              <Button
                onClick={() => loadNews(true)}
                variant="contained"
                color="error"
              >
                {t.retry}
              </Button>
            </Paper>
          </Box>
        )}

        {!loading && !error && news.length === 0 && (
          <Box textAlign="center" py={12}>
            <Typography color="text.secondary" variant="h6">{t.noNews}</Typography>
            <Button
              onClick={() => loadNews(true)}
              variant="contained"
              color="primary"
              sx={{ mt: 4 }}
            >
              {t.retry}
            </Button>
          </Box>
        )}

        {!loading && !error && news.length > 0 && (
          <Stack spacing={6}>
            {news.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                isExpanded={expandedCard === article.id}
                onToggle={() => handleCardToggle(article.id)}
                language={language}
              />
            ))}
          </Stack>
        )}
      </Container>

      <Box component="footer" sx={{
        bgcolor: 'transparent',
        mt: 8,
        py: 3
      }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>

            {/* Instagram */}
            <Tooltip title="Instagram @lisumwinrain">
              <Box component="a" href="https://www.instagram.com/lisumwinrain?igsh=aTBrb2g2YTVocnI4" target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', '&:hover': { transform: 'scale(1.15) translateY(-3px)', boxShadow: '0 8px 20px rgba(188,24,136,0.45)' } }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 48 48">
                  <defs>
                    <linearGradient id="footerIgGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f09433" />
                      <stop offset="35%" stopColor="#dc2743" />
                      <stop offset="100%" stopColor="#bc1888" />
                    </linearGradient>
                  </defs>
                  <rect width="48" height="48" rx="12" fill="url(#footerIgGrad)" />
                  <rect x="11" y="11" width="26" height="26" rx="7" fill="none" stroke="white" strokeWidth="2.5" />
                  <circle cx="24" cy="24" r="6.5" fill="none" stroke="white" strokeWidth="2.5" />
                  <circle cx="32.5" cy="15.5" r="1.8" fill="white" />
                </svg>
              </Box>
            </Tooltip>

            {/* LinkedIn */}
            <Tooltip title="LinkedIn">
              <Box component="a" href="https://www.linkedin.com/in/yinchao-chen-848038308?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', '&:hover': { transform: 'scale(1.15) translateY(-3px)', boxShadow: '0 8px 20px rgba(10,102,194,0.5)' } }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 48 48">
                  <defs>
                    <linearGradient id="footerLiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0a66c2" />
                      <stop offset="100%" stopColor="#0077b5" />
                    </linearGradient>
                  </defs>
                  <rect width="48" height="48" rx="12" fill="url(#footerLiGrad)" />
                  <circle cx="14" cy="15" r="3" fill="white" />
                  <rect x="11" y="21" width="6" height="14" fill="white" />
                  <path d="M 19 21 L 19 35 L 24.5 35 L 24.5 27.5 C 24.5 25 26 23.5 28.5 23.5 C 31 23.5 32 25 32 27.5 L 32 35 L 37 35 L 37 26.5 C 37 22 34.5 20 30.5 20 C 27.5 20 25.5 21.5 24.5 23 L 24.5 21 Z" fill="white" />
                </svg>
              </Box>
            </Tooltip>

            {/* YouTube */}
            <Tooltip title="YouTube @lisumchen">
              <Box component="a" href="https://youtube.com/@lisumchen?si=FzzBvHkdueg2Dzm-" target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', '&:hover': { transform: 'scale(1.15) translateY(-3px)', boxShadow: '0 8px 20px rgba(204,0,0,0.5)' } }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 48 48">
                  <defs>
                    <linearGradient id="footerYtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff2020" />
                      <stop offset="100%" stopColor="#cc0000" />
                    </linearGradient>
                  </defs>
                  <rect width="48" height="48" rx="12" fill="url(#footerYtGrad)" />
                  <rect x="7" y="14" width="34" height="20" rx="6" fill="none" stroke="white" strokeWidth="2.5" />
                  <polygon points="19,18 19,30 33,24" fill="white" />
                </svg>
              </Box>
            </Tooltip>

            {/* Medium */}
            <Tooltip title="Medium @lisumchen">
              <Box component="a" href="https://medium.com/@lisumchen" target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', '&:hover': { transform: 'scale(1.15) translateY(-3px)', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' } }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 48 48">
                  <defs>
                    <linearGradient id="footerMedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1a1a1a" />
                      <stop offset="100%" stopColor="#4a4a4a" />
                    </linearGradient>
                  </defs>
                  <rect width="48" height="48" rx="12" fill="url(#footerMedGrad)" />
                  <line x1="12" y1="35" x2="12" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
                  <line x1="36" y1="35" x2="36" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
                  <polyline points="12,14 24,27 36,14" fill="none" stroke="white" strokeWidth="4.5" strokeLinejoin="round" />
                </svg>
              </Box>
            </Tooltip>

          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default App;