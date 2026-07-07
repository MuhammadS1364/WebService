import { Link } from 'react-router-dom';
import { useState, CSSProperties } from 'react';

export default function NotFoundPage() {
  // Using React state to safely handle hover effects instead of direct DOM mutation
  const [isHomeHovered, setIsHomeHovered] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);

  // METHOD FIX: Typed the styles object as a dictionary of React CSS properties
  const styles: Record<string, CSSProperties> = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #EEF2F3 0%, #8E9EAB 100%)',
      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      padding: '20px',
      textAlign: 'center',
    },
    card: {
      background: 'white',
      padding: '50px',
      borderRadius: '20px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
      maxWidth: '500px',
      width: '100%',
    },
    errorCode: {
      fontSize: '80px',
      fontWeight: '800', // Note: React CSSProperties allows '800' (string) or 800 (number)
      margin: '0',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    title: {
      fontSize: '24px',
      color: '#333',
      margin: '10px 0 20px 0',
    },
    description: {
      color: '#666',
      fontSize: '16px',
      lineHeight: '1.5',
      marginBottom: '30px',
    },
    buttonContainer: {
      display: 'flex',
      gap: '15px',
      justifyContent: 'center',
      flexWrap: 'wrap', // No more errors here!
    },
    primaryBtn: {
      padding: '12px 24px',
      backgroundColor: '#667eea',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)',
      transform: isHomeHovered ? 'translateY(-2px)' : 'translateY(0)',
    },
    secondaryBtn: {
      padding: '12px 24px',
      backgroundColor: isLoginHovered ? '#f3f4f6' : 'transparent',
      color: '#667eea',
      textDecoration: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      border: '2px solid #667eea',
      transition: 'all 0.3s ease',
      transform: isLoginHovered ? 'translateY(-2px)' : 'translateY(0)',
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
            to="/" 
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