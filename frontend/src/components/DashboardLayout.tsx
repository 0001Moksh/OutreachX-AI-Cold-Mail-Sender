import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Mail,
  Users,
  Zap,
  Settings,
  LogOut,
  FileText,
  GitBranch,
  Menu,
  X,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeModule?: string;
}

export default function DashboardLayout({ children, activeModule = 'overview' }: DashboardLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningCampaign, setRunningCampaign] = useState<any>(null);
  const apiUrl = getApiUrl();

  const fetchCampaigns = async (token: string) => {
    try {
      const response = await fetch(`${apiUrl}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const active = data.data.find((c: any) => c.status === 'running');
          setRunningCampaign(active || null);
        }
      }
    } catch (err) {
      console.error('Error fetching campaigns in sidebar:', err);
    }
  };

  useEffect(() => {
    checkUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchCampaigns(session.access_token);
      }
    });

    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          fetchCampaigns(session.access_token);
        }
      });
    }, 8000); // Poll every 8 seconds

    return () => clearInterval(interval);
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    fetchUserProfile(session.access_token);
  };

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch(`${apiUrl}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Clear all localStorage so no cached data leaks to next user on same browser
    localStorage.clear();
    router.push('/login');
  };

  const modules = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'templates', label: 'Templates', icon: Mail, href: '/dashboard/templates' },
    { id: 'assets', label: 'Assets', icon: GitBranch, href: '/dashboard/assets' },
    { id: 'leads', label: 'Leads', icon: Users, href: '/dashboard/leads' },
    { id: 'campaigns', label: 'Campaigns', icon: Zap, href: '/dashboard/campaigns' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 fixed h-full z-40`}>
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-2xl font-bold">OutreachX</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="mt-8 space-y-2 px-3">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule === module.id;
            return (
              <button
                key={module.id}
                onClick={() => router.push(module.href)}
                className={`w-full flex items-center space-x-4 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{module.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Active Campaign Widget */}
        {runningCampaign && (
          sidebarOpen ? (
            <div className="absolute bottom-24 left-3 right-3 p-4 rounded-2xl bg-gray-800/40 border border-gray-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-300">
                    Active Campaign
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono font-medium">
                  {Math.round(((runningCampaign.sent_count + runningCampaign.failed_count) / Math.max(runningCampaign.total_leads, 1)) * 100)}%
                </span>
              </div>
              
              <p className="text-xs font-semibold text-white truncate mb-2">
                {runningCampaign.name}
              </p>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden mb-1.5">
                <div 
                  className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${Math.min(100, Math.round(((runningCampaign.sent_count + runningCampaign.failed_count) / Math.max(runningCampaign.total_leads, 1)) * 100))}%` 
                  }}
                />
              </div>
              
              <p className="text-[10px] text-gray-500 font-medium">
                {runningCampaign.sent_count + runningCampaign.failed_count} / {runningCampaign.total_leads} leads sent
              </p>
            </div>
          ) : (
            <div className="absolute bottom-24 left-0 right-0 flex justify-center">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-400"></span>
              </span>
            </div>
          )
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="absolute bottom-6 left-3 right-3 flex items-center space-x-4 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition w-auto"
        >
          <LogOut size={20} />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>

      {/* Main Content */}
      <div className={`${sidebarOpen ? 'ml-64' : 'ml-20'} flex-1 flex flex-col transition-all duration-300`}>
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-2xl font-bold text-gray-800">
            {modules.find((m) => m.id === activeModule)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-semibold text-gray-800">{user?.full_name || 'User'}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.full_name?.[0] || 'U'}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
