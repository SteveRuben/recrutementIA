// frontend/contexts/auth-context.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

// Créer un contexte d'authentification
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de AuthProvider');
  }
  return context;
};

// Fournisseur du contexte d'authentification
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Fonction pour mettre à jour l'utilisateur
  const updateUser = useCallback((updatedUserData) => {
    setUser(updatedUserData);
  }, []);

  // Charger l'utilisateur depuis le token lors du chargement initial
  useEffect(() => {
    const loadUserFromToken = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Configurer le token dans les en-têtes par défaut d'axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Récupérer les données utilisateur
        const userData = await fetchCurrentUser();
        setUser(userData);

      } catch (err) {
        console.error('Erreur lors du chargement de l\'utilisateur:', err);
        // En cas d'erreur, supprimer le token potentiellement expiré ou invalide
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setError('Session expirée. Veuillez vous reconnecter.');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    
    loadUserFromToken();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('Non authentifié');
      }
      
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expiré ou invalide, essayer de le rafraîchir
          const refreshed = await refreshToken();
          if (refreshed) {
            // Réessayer la requête avec le nouveau token
            return await fetchCurrentUser();
          }
          throw new Error('Session expirée');
        }
        throw new Error('Erreur lors de la récupération des informations utilisateur');
      }
      
      const data = await response.json();
      return data.user;
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
      return null;
    }
  };

  // Rafraîchir le token d'accès
  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem('refreshToken');
      
      if (!refresh) {
        return false;
      }
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refresh })
      });
      
      if (!response.ok) {
        // Si le refresh token est invalide, déconnecter l'utilisateur
        logout();
        return false;
      }
      
      const data = await response.json();
      
      // Mettre à jour les tokens
      localStorage.setItem('accessToken', data.tokens.access_token);
      localStorage.setItem('refreshToken', data.tokens.refresh_token);
      
      return true;
    } catch (err) {
      console.error('Erreur lors du rafraîchissement du token:', err);
      return false;
    }
  };

  // Fonction de connexion
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(email);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la connexion');
      }
      
      // Configurer le token dans les en-têtes par défaut d'axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.tokens.access_token}`;
      // Stocker les tokens
      localStorage.setItem('accessToken', data.tokens.access_token);
      localStorage.setItem('refreshToken', data.tokens.refresh_token);
      // Mettre à jour l'état utilisateur
      setUser(data.user);
      
      // Rediriger vers le tableau de bord
      router.push('/dashboard');
      
      return { success: true, user: data.user };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Une erreur est survenue lors de la connexion';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Appeler l'API de déconnexion
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {
          // Ignorer les erreurs lors de la déconnexion
        });
      }
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err);
    } finally {
      // Supprimer les tokens et réinitialiser l'état utilisateur
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
      
      // Rediriger vers la page de connexion
      router.push('/auth/login');
    }
  }, [router]);

  // Fonction d'inscription
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'inscription');
      }

      if (data.tokens) {
        localStorage.setItem('accessToken', data.tokens.access_token);
        localStorage.setItem('refreshToken', data.tokens.refresh_token);
        setUser(data.user);
      }
      
      return { success: true, user: data.user };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Une erreur est survenue lors de l\'inscription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

   // Fonction pour demander la réinitialisation du mot de passe
   const requestPasswordReset = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la demande de réinitialisation');
      }
      
      return { success: true, message: data.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour réinitialiser le mot de passe
  const resetPassword = async (token, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la réinitialisation du mot de passe');
      }
      
      return { success: true, message: data.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour changer le mot de passe
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('Non authentifié');
      }
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors du changement de mot de passe');
      }
      
      return { success: true, message: data.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Vérifier si l'utilisateur a une permission
  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Les administrateurs ont toutes les permissions
    if (user.role === 'admin') return true;
    
    // Vérifier dans les permissions explicites
    if (user.permissions && user.permissions.includes(permission)) return true;
    
    // Vérifier les permissions basées sur le rôle
    const rolePermissions = {
      'recruiter': ['view_candidates', 'manage_interviews', 'view_reports'],
      'manager': ['view_candidates', 'manage_interviews', 'view_reports', 'manage_team'],
      'user': ['view_own_profile']
    };
    
    return rolePermissions[user.role]?.includes(permission) || false;
  };

  // Vérifier si l'utilisateur est authentifié
  const isAuthenticated = !!user;

  // Valeur du contexte qui sera fournie aux composants consommateurs
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated,
    setError,
    fetchCurrentUser,
    requestPasswordReset,
    resetPassword,
    changePassword,
    updateUser, // Ajout crucial de la fonction updateUser
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};