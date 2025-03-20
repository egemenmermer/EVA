import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Avatar } from './avatar';
import { ExternalLink, Github, LogOut, Mail, FileText } from 'lucide-react';

interface UserProfileMenuProps {
  fullName: string;
  email: string;
  githubRepo?: string;
  researchPaper?: string;
  onLogout: () => void;
}

export function UserProfileMenu({
  fullName,
  email,
  githubRepo,
  researchPaper,
  onLogout,
}: UserProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors">
        <Avatar name={fullName} className="h-8 w-8" />
        <span className="font-medium">{fullName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{fullName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center" asChild>
          <a href={`mailto:${email}`}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Email</span>
          </a>
        </DropdownMenuItem>
        {githubRepo && (
          <DropdownMenuItem className="flex items-center" asChild>
            <a href={githubRepo} target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 h-4 w-4" />
              <span>GitHub Repository</span>
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </DropdownMenuItem>
        )}
        {researchPaper && (
          <DropdownMenuItem className="flex items-center" asChild>
            <a href={researchPaper} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 h-4 w-4" />
              <span>Research Paper</span>
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center text-red-600 dark:text-red-400" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 