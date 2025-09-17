import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AccordionContextProps {
  activeItem: string | null;
  setActiveItem: (value: string | null) => void;
  type: 'single' | 'multiple';
  value?: string | string[]; // For controlled component
  onValueChange?: (value: string | string[] | undefined) => void; // For controlled component
}

const AccordionContext = createContext<AccordionContextProps | undefined>(undefined);

const useAccordion = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('useAccordion must be used within an Accordion component');
  }
  return context;
};

interface AccordionProps {
  children: ReactNode;
  type?: 'single' | 'multiple';
  defaultValue?: string | string[]; // For uncontrolled single or multiple
  value?: string | string[]; // For controlled single or multiple
  onValueChange?: (value: string | string[] | undefined) => void; // For controlled single or multiple
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  children,
  type = 'single',
  defaultValue,
  value,
  onValueChange,
  className,
}) => {
  const [localActiveItem, setLocalActiveItem] = useState<string | string[] | undefined>(
    defaultValue
  );

  // Determine active item: controlled or uncontrolled
  const currentActiveItem = value !== undefined ? value : localActiveItem;

  const handleSetActiveItem = (itemValue: string | null) => {
    let newValue: string | string[] | undefined;
    if (type === 'single') {
      newValue = currentActiveItem === itemValue ? undefined : itemValue || undefined;
    } else { // multiple
      const currentArray = Array.isArray(currentActiveItem) ? currentActiveItem : [];
      if (itemValue === null) { // Should not happen with current usage but good for robustness
        newValue = currentArray;
      } else if (currentArray.includes(itemValue)) {
        newValue = currentArray.filter((v) => v !== itemValue);
      } else {
        newValue = [...currentArray, itemValue];
      }
      if (newValue.length === 0) newValue = undefined; // Consistent with Shadcn for empty multiple
    }

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setLocalActiveItem(newValue);
    }
  };
  
  // Adapt single string to array for multiple type, and vice-versa for context
  const contextValueForSetActive = (itemValue: string | null) => {
     handleSetActiveItem(itemValue);
  };
  
  const contextActiveItem = type === 'multiple' 
    ? (Array.isArray(currentActiveItem) ? currentActiveItem : (currentActiveItem ? [currentActiveItem] : []))
    : (Array.isArray(currentActiveItem) ? currentActiveItem[0] : currentActiveItem) || null;


  return (
    <AccordionContext.Provider 
        value={{
            activeItem: contextActiveItem as string | null, // Ensure it's string or null for context
            setActiveItem: contextValueForSetActive,
            type,
            value: value, // Pass controlled value if provided
            onValueChange: onValueChange // Pass controlled callback
        }}
    >
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
};

interface AccordionItemProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ children, value, className }) => {
  // No direct state needed here, context handles it
  return <div className={className}>{children}</div>;
};

interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>; // Allow custom onClick
}

export const AccordionTrigger: React.FC<AccordionTriggerProps> = ({ children, className, onClick }) => {
  const { activeItem, setActiveItem, type } = useAccordion();
  // Item value is derived from the parent AccordionItem's value prop.
  // We need to find the AccordionItem parent to get its value.
  // This is a simplification; a more robust way would involve another context or refs.
  // For now, assume onClick is passed from ChatWindow with the correct key.
  
  // This component itself doesn't know its own 'value'. The click handler in ChatWindow
  // calls toggleSection which uses the section.key.

  return (
    <button
      className={className} 
      onClick={onClick} // Use the passed onClick
      // Add ARIA attributes for accessibility if desired
      // aria-expanded={isActive}
      // aria-controls={`accordion-content-${itemValue}`}
    >
      {children}
    </button>
  );
};

interface AccordionContentProps {
  children: ReactNode;
  className?: string;
}

export const AccordionContent: React.FC<AccordionContentProps> = ({ children, className }) => {
  // const { activeItem } = useAccordion();
  // This component also doesn't know its specific value directly without more context.
  // Visibility is controlled by conditional rendering in ChatWindow based on `expandedSections`.
  
  return (
    <div 
      className={className}
      // Add ARIA attributes
      // role="region"
      // aria-labelledby={`accordion-trigger-${itemValue}`}
      // hidden={!isActive}
    >
      {children}
    </div>
  );
}; 