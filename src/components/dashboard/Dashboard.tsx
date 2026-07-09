import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Project, TestCase, ActivityLog } from '../../types';

import AdminDashboard from './AdminDashboard';
import TeamLeadDashboard from './TeamLeadDashboard';
import DeveloperDashboard from './DeveloperDashboard';
import TesterDashboard from './TesterDashboard';
import InternDashboard from './InternDashboard';

interface DashboardProps {
  projects: Project[];
  selectedProjectId?: string;
  onSelectProject: (id: string) => void;
  // Passing these down for backwards compatibility with AdminDashboard
  testCases?: TestCase[]; 
  activityLogs?: ActivityLog[];
  onNavigateToTab?: (tab: string) => void;
}

export default function Dashboard({ 
  projects, 
  selectedProjectId = '', 
  onSelectProject,
  testCases = [],
  activityLogs = [],
  onNavigateToTab = () => {}
}: DashboardProps) {
  const { currentUser } = useAuth();
  
  // Fallback to tester if no user
  const role = currentUser?.role || 'tester';

  switch (role) {
    case 'admin':
      return (
        <AdminDashboard 
          projects={projects} 
          testCases={testCases} 
          activityLogs={activityLogs} 
          onSelectProject={onSelectProject}
          onNavigateToTab={onNavigateToTab}
        />
      );
    case 'team_lead':
      return (
        <TeamLeadDashboard 
          projects={projects}
          onSelectProject={onSelectProject}
          onNavigateToTab={onNavigateToTab}
        />
      );
    case 'developer':
      return (
        <DeveloperDashboard 
          projects={projects}
          onSelectProject={onSelectProject}
          onNavigateToTab={onNavigateToTab}
        />
      );
    case 'tester':
      return (
        <TesterDashboard 
          projects={projects}
          onSelectProject={onSelectProject}
          onNavigateToTab={onNavigateToTab}
        />
      );
    case 'intern':
      return (
        <InternDashboard 
          projects={projects}
          onSelectProject={onSelectProject}
          onNavigateToTab={onNavigateToTab}
        />
      );
    default:
      return (
        <TesterDashboard 
          projects={projects}
          onSelectProject={onSelectProject}
          onNavigateToTab={onNavigateToTab}
        />
      );
  }
}
