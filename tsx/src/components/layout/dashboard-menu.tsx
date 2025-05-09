// components/layout/DashboardMenu.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  HomeIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  VideoCameraIcon,
  CreditCardIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  FaceSmileIcon,
  CogIcon,
  BellIcon,
  CpuChipIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { Subscription } from '@/types';

interface DashboardMenuProps {
  userRole?: string;
  subscription?: Subscription | null;
}



interface MenuItem {
  name: string;
  href: string;
  icon: React.ElementType;
  access: boolean;
  submenu?: SubMenuItem[];
}

interface SubMenuItem {
  name: string;
  href: string;
  access?: boolean;
}

type OpenSubmenusState = {
  [key: string]: boolean;
};

const DashboardMenu: React.FC<DashboardMenuProps> = ({ userRole = 'recruiter', subscription = null }) => {
  const router = useRouter();

  // Vérifier si l'utilisateur a accès à une fonctionnalité en fonction de son plan
  const hasAccess = (feature: string): boolean => {
    if (!subscription) return false;
    
    const planFeatures: Record<string, string[]> = {
      'freemium': ['basic_interviews', 'basic_analytics'],
      'starter': ['basic_interviews', 'basic_analytics', 'storage_30d', 'full_candidate_analysis'],
      'pro': ['basic_interviews', 'basic_analytics', 'storage_1y', 'full_candidate_analysis', 
              'ats_integration', 'collaboration', 'ai_assistants'],
      'enterprise': ['basic_interviews', 'basic_analytics', 'storage_unlimited', 'full_candidate_analysis', 
                     'ats_integration', 'collaboration', 'biometric_analysis', 'api_access', 'ai_assistants']
    };
    
    return planFeatures[subscription.plan]?.includes(feature) || false;
  };
  
  const isAdmin = userRole === 'admin';

  // Liste des éléments du menu
  const menuItems: MenuItem[] = [
    {
      name: 'Tableau de bord',
      href: '/dashboard',
      icon: HomeIcon,
      access: true // Accessible à tous
    },
    {
      name: 'Entretiens',
      href: '/interviews',
      icon: VideoCameraIcon,
      access: true,
      submenu: [
        { name: 'Tous les entretiens', href: '/interviews' },
        { name: 'Nouvel entretien', href: '/interviews/new' },
        { name: 'Entretiens planifiés', href: '/interviews/scheduled' },
        { name: 'Entretiens terminés', href: '/interviews/completed' }
      ]
    },
    {
      name: 'Candidatures',
      href: '/candidatures',
      icon: UserGroupIcon,
      access: true,
      submenu:[
        {
          name: 'Emplois',
          href: '/jobs'
        },
        {
          name: 'Candidats',
          href: '/candidates'
        }
      ]
    },
    {
      name: 'Analyse de CV',
      href: '/resumes/analyze',
      icon: DocumentTextIcon,
      access: hasAccess('full_candidate_analysis') || true , // Temporairement accessible à tous pour le développement
      submenu:[
        {
          name: 'Analyse de CV vs Emploi',
          href: '/resumes/analyze'
        },
        {
          name: 'Generation d\'exercice d\'evaluation',
          href: '/resumes/generate'
        },
        {
          name: 'Generation d\'exercice d\'entrainement',
          href: '/resumes/generateTraining'
        }
      ]
    },
    {
      name: 'Assistants IA',
      href: '/ai-assistants',
      icon: CpuChipIcon,
      access: hasAccess('ai_assistants') || true, // Temporairement accessible à tous pour le développement
      submenu: [
        { name: 'Mes assistants', href: '/ai-assistants' },
        { name: 'Créer un assistant', href: '/ai-assistants/create' },
        { name: 'Galerie de modèles', href: '/ai-assistants/gallery' }
      ]
    },
    {
      name: 'Analyse biométrique',
      href: '/biometrics',
      icon: FaceSmileIcon,
      access: hasAccess('biometric_analysis') || true
    },
    {
      name: 'Collaboration',
      href: '/collaboration',
      icon: ChatBubbleLeftRightIcon,
      access: hasAccess('collaboration') || true
    },
    {
      name: 'Analytiques',
      href: '/analytics',
      icon: ChartBarIcon,
      access: true,
      submenu: [
        { name: 'Vue d\'ensemble', href: '/analytics' },
        { name: 'Rapports', href: '/analytics/reports' },
        { name: 'Performance par poste', href: '/analytics/positions' }
      ]
    },
    {
      name: 'Facturation',
      href: '/billing',
      icon: CreditCardIcon,
      access: true
    },
    {
      name: 'Paramètres',
      href: '/settings',
      icon: CogIcon,
      access: true,
      submenu: [
        { name: 'Profil', href: '/settings/profile' },
        { name: 'Organisation', href: '/settings/organization' },
        { name: 'Utilisateurs', href: '/settings/users', access: isAdmin || true },
        { name: 'Intégrations', href: '/settings/integrations', access: hasAccess('ats_integration') || true },
        { name: 'API', href: '/settings/api', access: hasAccess('api_access') || true }
      ]
    },
    {
      name: 'Administration',
      href: '/admin',
      icon: CogIcon,
      access: isAdmin || true,
      submenu: [
        { name: 'Gestion des utilisateurs', href: '/admin/users' },
        { name: 'Plans et tarifs', href: '/admin/plans' },
        { name: 'Journal d\'activité', href: '/admin/logs' },
        { name: 'Documentation', href: '/admin/documentation' }
      ]
    }
  ];

  // État pour gérer les sous-menus ouverts
  const [openSubmenus, setOpenSubmenus] = useState<OpenSubmenusState>({});

  const toggleSubmenu = (menuName: string): void => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  return (
    <nav className="mt-5 space-y-1 px-2">
      {menuItems.map((item) => {
        // Vérifier si l'élément devrait être affiché en fonction des droits d'accès
        if (!item.access) return null;
        
        const isActive = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`);
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const isSubmenuOpen = openSubmenus[item.name];
        
        return (
          <div key={item.name}>
            {hasSubmenu ? (
              <button
                onClick={() => toggleSubmenu(item.name)}
                className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 ${
                    isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-600'
                  }`}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
                <svg
                  className={`ml-3 h-5 w-5 transform transition-transform duration-150 ${
                    isSubmenuOpen ? 'rotate-90' : ''
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            ) : (
              <>
                <a  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-600'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                </a>
              </>
            )}

            {/* Sous-menu */}
            {hasSubmenu && isSubmenuOpen && (
              <div className="mt-1 ml-7 space-y-1">
                {item?.submenu?.map((subItem) => {
                  // Vérifier les droits d'accès du sous-élément
                  if (subItem.access === false) return null;
                  
                  const isSubActive = router.pathname === subItem.href;
                  
                  return (
                    <>
                      <a key={subItem.name} href={subItem.href}
                        className={`group flex items-center pl-4 pr-2 py-2 text-sm font-medium rounded-md ${
                          isSubActive
                            ? 'bg-primary-50 text-primary-800'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span>{subItem.name}</span>
                      </a>
                    </>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Élément spécial pour les notifications avec compteur - commenté dans l'original */}
      {/* 
      <a href="/notifications">
        <a className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900">
          <BellIcon
            className="mr-3 flex-shrink-0 h-5 w-5 text-gray-500 group-hover:text-gray-600"
            aria-hidden="true"
          />
          <span>Notifications</span>
          {unreadNotifications > 0 && (
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              {unreadNotifications}
            </span>
          )}
        </a>
      </a> 
      */}
    </nav>
  );
};

export default DashboardMenu;