// frontend/services/websocket-service.ts
import { showToast } from '@/components/notifications';
import { io, Socket } from 'socket.io-client';
import Notification from '@/types/notification';

type EventCallback = (data: any) => void;
type EventListeners = Record<string, EventCallback[]>;

class WebSocketService {
  /**
   * Service pour gérer la connexion WebSocket et les notifications en temps réel
   */
  private socket: Socket | null;
  private connected: boolean;
  private userId: string | null;
  private apiUrl: string;
  private listeners: EventListeners;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;

  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 secondes
  }

  /**
   * Initialise et connecte le service WebSocket
   * 
   * @param {string} userId - ID de l'utilisateur connecté
   * @param {string} token - Token d'authentification JWT
   * @returns {Promise<void>} Promesse résolue quand la connexion est établie
   */
  connect(userId: string, token?: string): Promise<void> {
    if (!userId) {
      console.error('userId est requis pour la connexion WebSocket');
      return Promise.reject(new Error('userId est requis'));
    }

    if (this.connected && this.userId === userId) {
      return Promise.resolve();
    }

    this.userId = userId;

    return new Promise<void>((resolve, reject) => {
      try {
        // Déconnecter l'ancienne socket si elle existe
        if (this.socket) {
          this.disconnect();
        }

        // Créer une nouvelle connexion
        this.socket = io(this.apiUrl, {
          transports: ['websocket'],
          auth: {
            token
          }
        });

        // Gestionnaire de connexion
        this.socket.on('connect', () => {
          console.log('WebSocket connecté');
          this.connected = true;
          this.reconnectAttempts = 0;

          // Rejoindre le canal de l'utilisateur
          this.socket.emit('join_user_channel', { user_id: userId, token });
        });

        // Confirmation de l'abonnement au canal
        this.socket.on('channel_joined', (data: any) => {
          console.log('Canal de notifications rejoint', data);
          resolve();
        });

        // Gestionnaire de déconnexion
        this.socket.on('disconnect', () => {
          console.log('WebSocket déconnecté');
          this.connected = false;
          this._attemptReconnect();
        });

        // Gestionnaire d'erreur de connexion
        this.socket.on('connect_error', (error: any) => {
          console.error('Erreur de connexion WebSocket:', error);
          this._attemptReconnect();
          reject(error);
        });

        // Gestionnaire de notifications
        this.socket.on('notification', (notification: Notification) => {
          console.log('Notification reçue:', notification);
          
          // Afficher un toast pour la notification
          showToast(notification);
          
          // Déclencher un événement pour mettre à jour la liste des notifications
          this._triggerEvent('notification_received', notification);
          
          // Déclencher aussi un événement global pour que d'autres composants puissent réagir
          const event = new CustomEvent('NOTIFICATION_RECEIVED', { detail: notification });
          window.dispatchEvent(event);
        });

      } catch (error) {
        console.error('Erreur lors de l\'initialisation WebSocket:', error);
        this.connected = false;
        reject(error);
      }
    });
  }

  /**
   * Déconnecte le service WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.userId = null;
    }
  }

  /**
   * S'abonne à un événement du service
   * 
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction de rappel
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Se désabonne d'un événement
   * 
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction de rappel à supprimer
   */
  off(event: string, callback: EventCallback): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Déclenche un événement du service
   * 
   * @param {string} event - Nom de l'événement
   * @param {*} data - Données à transmettre aux écouteurs
   * @private
   */
  private _triggerEvent(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erreur dans l'écouteur d'événement ${event}:`, error);
        }
      });
    }
  }

  /**
   * Tente de se reconnecter après une déconnexion
   * @private
   */
  private _attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Nombre maximum de tentatives de reconnexion atteint');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${this.reconnectInterval / 1000}s...`);

    setTimeout(() => {
      if (!this.connected && this.userId) {
        console.log('Tentative de reconnexion...');
        // Récupérer le token depuis localStorage pour la reconnexion
        const token = localStorage.getItem('token');
        if (token) {
          this.connect(this.userId, token)
            .catch(error => {
              console.error('Échec de la reconnexion:', error);
            });
        }
      }
    }, this.reconnectInterval);
  }

  /**
   * Vérifie si le service est connecté
   * 
   * @returns {boolean} État de la connexion
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// Déclaration pour l'extension de l'interface Window
declare global {
  interface WindowEventMap {
    NOTIFICATION_RECEIVED: CustomEvent<Notification>;
  }
}

// Exporter une instance singleton
const websocketService = new WebSocketService();
export default websocketService;