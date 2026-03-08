import { 
  LayoutDashboard, 
  Layout, 
  Users, 
  FolderKanban, 
  MessageSquare,
  History,
  Calendar,
  Image,
  ArrowLeft
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  Button
} from "@/components/ui-components";
import NotificationBadge from "../../../../../components/ui-components/NotificationBadge/NotificationBadge";
import StatusDropdown from "../../../../../components/ui-components/StatusDropdown/StatusDropdown";
import { Avatar, AvatarImage, AvatarFallback } from "../../../../../components/shadcn-components/shadcn-avatar/avatar";
import { useAuth } from "../../../../../context/AuthContext";
import { getAvatarUrl } from "../../../../../utils/avatarUtils";
const ProjectSidebar = ({
  activeTab,
  onTabChange,
  showAIPreviewsSection,
  hasOverviewNotifications,
  hasAIPreviewNotifications,
  hasProgrammersNotifications,
  hasWorkspaceNotifications,
  hasActivityNotifications,
  hasCommentsNotifications,
}) => {
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, hasNotification: hasOverviewNotifications, show: true },
    { id: "ai-preview", label: "Previews", icon: Layout, hasNotification: hasAIPreviewNotifications, show: showAIPreviewsSection },
    { id: "programmers", label: "Team", icon: Users, hasNotification: hasProgrammersNotifications, show: true },
    { id: "timeline", label: "Workspace", icon: FolderKanban, hasNotification: hasWorkspaceNotifications, show: true },
    { id: "assets", label: "Assets", icon: Image, hasNotification: false, show: true },
    { id: "calendar", label: "Calendar", icon: Calendar, hasNotification: false, show: true },
    { id: "activity", label: "Activity", icon: History, hasNotification: hasActivityNotifications, show: true },
    { id: "comments", label: "Chat", icon: MessageSquare, hasNotification: hasCommentsNotifications, show: true },
  ];
  const { user } = useAuth()
  return (
<Sidebar 
      variant="sidebar" 
      collapsible="icon" 
      className="relative border-r"
    >

      <SidebarTrigger 
        className="absolute right-[-12px] top-3 z-50 h-5 w-5 rounded-full border bg-white shadow-md hover:bg-gray-50 flex items-center justify-center [&>svg]:size-3" 
      />

      <SidebarHeader className="pt-2 pb-0 flex flex-row justify-start w-full group-data-[collapsible=icon]:justify-center">
        <Button
          to="/projects"
          variant="ghost"
          size="sm"
          className="w-fit justify-start p-2 mt-1 text-ink-muted hover:text-ink group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:-translate-x-0.5"
          title="Back to Projects"
        >
          <ArrowLeft className="size-4 shrink-0" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="gap-1">
        <SidebarGroup className="p-1 pt-0 pl-0">
          <div className="flex w-full justify-center pt-1 pb-1 mb-2 group-data-[collapsible=icon]:pb-2">
            <StatusDropdown 
              trigger={
                <div className="relative cursor-pointer">
                  <Avatar className="w-8 h-8 bg-transparent">
                    <AvatarImage src={getAvatarUrl(user?.avatar)} alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  
                  <span 
                    className="absolute bottom-0 right-0 z-20 w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: user?.status === 'online' ? '#4caf50' : 
                                      user?.status === 'busy' ? '#f44336' : 
                                      user?.status === 'away' ? '#facc15' : '#9e9e9e' 
                    }} 
                  />
                </div>
              } 
            />
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item) => {
                if (!item.show) return null;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      size="sm"
                      onClick={() => onTabChange(item.id)}
                      isActive={activeTab === item.id}
                      tooltip={item.label}
                      className="pl-0 pr-1.5 rounded-none [&>svg]:size-3 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                    >
                      <item.icon className="size-3 shrink-0" /> 
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