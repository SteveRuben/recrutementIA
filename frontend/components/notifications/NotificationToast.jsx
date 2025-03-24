// frontend/components/notifications/NotificationToast.jsx
import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  X,
  MessageSquare,
  FileText,
  Users,
  Calendar
} from 'lucide-react';
import { useRouter } from 'next/router';

// Fonction pour déterminer l'icône selon le type de notification
const getNotificationIcon = (type) => {
  switch (type) {
    case 'interview_completed':
      return <MessageSquare className="h-5 w-5 text-white" />;
    case 'resume_analyzed':
      return <FileText className="h-5 w-5 text-white" />;
    case 'candidate_feedback':
      return <Users className="h-5 w-5 text-white" />;
    case 'interview_scheduled':
      return <Calendar className="h-5 w-5 text-white" />;
    case 'error':
      return <AlertTriangle className="h-5 w-5 text-white" />;
    case 'success':
      return <CheckCircle className="h-5 w-5 text-white" />;
    case 'info':
      return <Info className="h-5 w-5 text-white" />;
    default:
      return <Bell className="h-5 w-5 text-white" />;
  }
};

// Fonction pour déterminer la couleur de fond selon le type
const getBackgroundColor = (type) => {
  switch (type) {
    case 'error':
      return 'bg-red-600';
    case 'success':
      return 'bg-green-600';
    case 'interview_completed':
      return 'bg-blue-600';
    case 'resume_analyzed':
      return 'bg-green-600';
    case 'candidate_feedback':
      return 'bg-purple-600';
    case 'interview_scheduled':
      return 'bg-orange-500';
    case 'info':
      return 'bg-blue-500';
    default:
      return 'bg-gray-800';
  }
};

// Composant toast pour une notification
const NotificationToast = ({ notification, onClose, autoClose = true }) => {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  
  // Disparition automatique
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Permet l'animation avant de fermer
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  // Permet la navigation vers l'élément concerné
  const handleClick = () => {
    if (notification.reference_id) {
      let url;
      switch (notification.type) {
        case 'interview_completed':
          url = `/interviews/${notification.reference_id}/results`;
          break;
        case 'resume_analyzed':
          url = `/resumes/${notification.reference_id}`;
          break;
        case 'candidate_feedback':
          url = `/candidates/${notification.reference_id}/feedback`;
          break;
        case 'interview_scheduled':
          url = `/interviews/${notification.reference_id}`;
          break;
        default:
          url = null;
      }
      
      if (url) {
        router.push(url);
        onClose();
      }
    }
  };

  return (
    <div 
      className={`transform transition-all duration-300 ease-in-out ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div 
        className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${getBackgroundColor(notification.type)}`}
        role="alert"
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-white">
                {notification.title}
              </p>
              <p className="mt-1 text-sm text-white opacity-90">
                {notification.message}
              </p>
              {notification.reference_id && (
                <button
                  onClick={handleClick}
                  className="mt-2 text-xs font-medium text-white underline"
                >
                  Voir les détails
                </button>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="inline-flex text-white focus:outline-none focus:ring-2 focus:ring-white"
                onClick={() => {
                  setVisible(false);
                  setTimeout(onClose, 300);
                }}
              >
                <span className="sr-only">Fermer</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;