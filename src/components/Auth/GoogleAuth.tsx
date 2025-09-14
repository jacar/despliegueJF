import React, { useEffect } from 'react';

declare global {
  interface Window {
    google: any;
    handleGoogleSignIn: (response: any) => void;
  }
}

interface GoogleAuthProps {
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  buttonText?: string;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ 
  onSuccess, 
  onError,
  buttonText = 'Iniciar sesión con Google' 
}) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  useEffect(() => {
    // Cargar el script de Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    // Manejar la respuesta de autenticación
    window.handleGoogleSignIn = (response: any) => {
      if (response.credential) {
        onSuccess(response.credential);
      } else {
        onError('No se pudo completar la autenticación');
      }
    };

    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
      delete window.handleGoogleSignIn;
    };
  }, [onSuccess, onError]);

  return (
    <div className="google-signin-button">
      <div
        id="g_id_onload"
        data-client_id={clientId}
        data-callback="handleGoogleSignIn"
        data-auto_prompt="false"
      />
      <div
        className="g_id_signin"
        data-type="standard"
        data-size="large"
        data-theme="outline"
        data-text="sign_in_with"
        data-shape="rectangular"
        data-logo_alignment="left"
      />
    </div>
  );
};

export default GoogleAuth;
