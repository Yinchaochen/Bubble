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
    downloadDocs: string; // 新增翻译
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
    downloadDocs: 'Download Documentation', // 新增
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
    downloadDocs: 'Dokumentation herunterladen', // 新增
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
    downloadDocs: '下载文档', // 新增
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

// 新增 PDF 下载按钮组件
const PdfDownloadButton: React.FC<{ language: LanguageCode }> = ({ language }) => {
  const t = translations[language];
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/downloads/Bubble Entwickler-Protokoll.pdf';
    link.download = 'Bubble Entwickler-Protokoll.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Tooltip title={t.downloadDocs} arrow>
      <IconButton
        onClick={handleDownload}
        sx={{
          color: 'primary.main',
          border: 1,
          borderColor: 'primary.main',
          borderRadius: 1,
          '&:hover': {
            bgcolor: 'primary.light',
            color: 'white',
          },
          transition: 'all 0.2s ease'
        }}
      >
        <Download size={20} />
      </IconButton>
    </Tooltip>
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
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)'
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
              <PdfDownloadButton language={language} />
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
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        mt: 8,
        py: 3
      }}>
        <Container maxWidth="lg">
         <Typography variant="body2" color="text.secondary" align="center">
          Bubble - Powered by News API & OpenAI<br />
          E-Mail: lisumchen@gmail.com<br />
          INSTAGRAM: lisumwinrain<br />
          Tel: +49 15252827691
         </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default App;