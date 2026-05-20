import React from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  RefreshCw, 
  Search, 
  MoreVertical,
  ExternalLink,
  ChevronLeft,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

export const PageHeader: React.FC<{ 
  title: string; 
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}> = ({ title, subtitle, actions, icon, onRefresh, isRefreshing }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 lg:px-6 py-3 lg:py-4 bg-brand-muted border-b border-brand-text gap-3">
      <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
        {icon && (
          <div className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center text-brand-text shrink-0">
            {icon}
          </div>
        )}
        <h2 className="text-lg lg:text-xl font-serif-italic text-brand-text truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-2 justify-end">
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 border border-brand-text text-brand-text hover:bg-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
          </button>
        )}
        {actions}
      </div>
    </div>
  );
};

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  noPadding?: boolean;
}> = ({ children, className, noPadding }) => (
  <div className={cn(
    "bg-white border border-brand-text overflow-hidden",
    !noPadding && "p-4",
    className
  )}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}> = ({ children, className, variant = 'primary', size = 'md', icon, ...props }) => {
  const variants = {
    primary: "bg-brand-text text-brand-bg hover:opacity-90",
    secondary: "bg-brand-muted border border-brand-text text-brand-text hover:bg-white",
    ghost: "text-brand-text hover:bg-brand-muted",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };

  const sizes = {
    sm: "px-2 py-1 text-[10px]",
    md: "px-4 py-2 text-[10px]",
    lg: "px-6 py-3 text-xs",
  };

  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition-all disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input 
    className={cn(
      "w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-text transition-all placeholder:italic",
      className
    )}
    {...props}
  />
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-brand-muted animate-pulse", className)} />
);

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-brand-bg border border-brand-text shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-brand-text bg-brand-muted">
          <h3 className="font-serif-italic text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white border border-transparent hover:border-brand-text transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => (
  <select
    className={cn(
      "w-full bg-white border border-brand-text px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-text transition-all appearance-none cursor-pointer",
      className
    )}
    {...props}
  >
    {children}
  </select>
);
