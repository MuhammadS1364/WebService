import { Link } from 'react-router-dom';
import { useState, type CSSProperties } from 'react';

export default function NotFoundPage() {
  const [isHomeHovered, setIsHomeHovered] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);

  const styles: Record<string, CSSProperties> = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      // Clean, airy, modern light background
      background: 'linear-gradient(135deg, #f6f8fd 0%, #f1f5f9 100%)',
      fontFamily: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      padding: '20px',
    },
    card: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      padding: '60px 40px',
      borderRadius: '32px', // Much friendlier, softer corners
      // Deep, smooth, modern floating shadow
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0,0,0,0.02)',
      maxWidth: '480px',
      width: '100%',
      textAlign: 'center',
    },
    errorCode: {
      fontSize: '120px', // Massive and bold
      fontWeight: '900',
      margin: '0',
      lineHeight: '1',
      // Vibrant, eye-catching Indigo to Pink gradient
      background: 'linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '-5px', // Trendy tight spacing
      marginBottom: '16px',
    },
    title: {
      fontSize: '28px',
      color: '#111827',
      fontWeight: '700',
      margin: '0 0 16px 0',
    },
    description: {
      color: '#6B7280',
      fontSize: '16px',
      lineHeight: '1.6',
      marginBottom: '40px',
    },
    buttonContainer: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    primaryBtn: {
      padding: '14px 32px',
      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '50px', // Pill-shaped buttons are highly clickable
      fontWeight: '600',
      fontSize: '15px',
      // Buttery smooth transition
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      // Dynamic glowing shadow on hover
      boxShadow: isHomeHovered 
        ? '0 10px 20px -10px rgba(124, 58, 237, 0.7)' 
        : '0 4px 6px -1px rgba(124, 58, 237, 0.2)',
      transform: isHomeHovered ? 'translateY(-3px)' : 'translateY(0)',
    },
    secondaryBtn: {
      padding: '14px 32px',
      backgroundColor: isLoginHovered ? '#F3F4F6' : 'transparent',
      color: isLoginHovered ? '#111827' : '#4B5563',
      textDecoration: 'none',
      borderRadius: '50px',
      fontWeight: '600',
      fontSize: '15px',
      border: '2px solid',
      borderColor: isLoginHovered ? '#F3F4F6' : '#E5E7EB',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isLoginHovered ? 'translateY(-3px)' : 'translateY(0)',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.errorCode}>404</h1>
        <h2 style={styles.title}>Page Not Found</h2>
        <p style={styles.description}>
          Oops! The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>
        <div style={styles.buttonContainer}>
          <Link 
            to="/public-panel/dashboard" 
            style={styles.primaryBtn} 
            onMouseEnter={() => setIsHomeHovered(true)}
            onMouseLeave={() => setIsHomeHovered(false)}
          >
            Go to Home
          </Link>
          
          <Link 
            to="/login" 
            style={styles.secondaryBtn}
            onMouseEnter={() => setIsLoginHovered(true)}
            onMouseLeave={() => setIsLoginHovered(false)}
          >
            Login Now
          </Link>
        </div>
      </div>
    </div>
  );
}