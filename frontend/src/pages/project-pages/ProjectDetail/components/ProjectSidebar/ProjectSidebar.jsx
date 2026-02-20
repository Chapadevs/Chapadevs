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
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default ProjectSidebar;