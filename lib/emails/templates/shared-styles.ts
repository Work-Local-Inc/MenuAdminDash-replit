export const BRAND_RED = '#DC2626';
export const LOGO_URL = 'https://menu.ca/logo.png';
export const HERO_BG_URL = 'https://menu.ca/email-hero-bg.jpg';

export const brandHeader = {
  backgroundColor: '#ffffff',
  padding: '20px 24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e5e7eb',
};

export const logoImage = {
  width: '140px',
  height: 'auto',
};

export const heroSectionWithBg = {
  backgroundImage: `linear-gradient(rgba(220, 38, 38, 0.85), rgba(220, 38, 38, 0.85)), url(${HERO_BG_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  padding: '48px 24px',
  textAlign: 'center' as const,
};

export const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  padding: '20px 0',
};

export const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
};

export const footer = {
  backgroundColor: '#f9fafb',
  padding: '32px 24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e5e7eb',
};

export const footerText = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 8px',
};

export const footerSubtext = {
  color: '#9ca3af',
  fontSize: '13px',
  margin: '0',
};
