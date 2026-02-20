import { 
  Settings, 
  Layout, 
  Users, 
  FolderKanban, 
  MessageSquare,
  History
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger
} from "@/components/ui-components";
import NotificationBadge from "../../../../../components/ui-components/NotificationBadge/NotificationBadge";
import StatusDropdown from "../../../../../components/ui-components/StatusDropdown/StatusDropdown";
import { Avatar, AvatarImage, AvatarFallback } from "../../../../../components/ui-components/Avatar/Avatar";
import { useAuth } from "../../../../../context/AuthContext";
const ProjectSidebar = ({
  activeTab,
  onTabChange,
  showAIPreviewsSection,
  hasSettingsNotifications,
  hasAIPreviewNotifications,
  hasProgrammersNotifications,
  hasTimelineNotifications,
  hasActivityNotifications,
  hasCommentsNotifications,
}) => {
  const navItems = [
    { id: "ai-preview", label: "Previews", icon: Layout, hasNotification: hasAIPreviewNotifications, show: showAIPreviewsSection },
    { id: "programmers", label: "Team", icon: Users, hasNotification: hasProgrammersNotifications, show: true },
    { id: "timeline", label: "Workspace", icon: FolderKanban, hasNotification: hasTimelineNotifications, show: true },
    { id: "activity", label: "Activity", icon: History, hasNotification: hasActivityNotifications, show: true },
    { id: "comments", label: "Chat", icon: MessageSquare, hasNotification: hasCommentsNotifications, show: true },
    { id: "settings", label: "Settings", icon: Settings, hasNotification: hasSettingsNotifications, show: true },
  ];
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('data:image/')) return avatar
    if (avatar.startsWith('/uploads/')) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
      const baseUrl = backendUrl.replace('/api', '').replace(/\/$/, '')
      return `${baseUrl}${avatar}`
    }
    return avatar
  }
  const { user } = useAuth()
  return (
<Sidebar 
      variant="sidebar" 
      collapsible="icon" 
      className="relative border-r"
    >

      <SidebarTrigger 
        className="absolute right-[-14px] top-20 z-50 h-7 w-7 rounded-full border bg-white shadow-md hover:bg-gray-50 flex items-center justify-center" 
      />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (!item.show) return null;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={activeTab === item.id}
                      tooltip={item.label}
                    >
                      <item.icon className="size-4 shrink-0" /> 
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    {item.hasNotification && (
                      <NotificationBadge />
                    )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
            <StatusDropdown 
              trigger={
                <div className="relative cursor-pointer">
                  <Avatar className="w-10 h-10 border border-white/10">
                    <AvatarImage src={getAvatarUrl(user?.avatar)} alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <span 
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black"
                    style={{ 
                      backgroundColor: user?.status === 'online' ? '#4caf50' : 
                                      user?.status === 'busy' ? '#f44336' : 
                                      user?.status === 'away' ? '#facc15' : '#9e9e9e' 
                    }} 
                  />
                </div>
              } 
            />
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default ProjectSidebar;