import { Label } from '@/types/kanban';
import { cn } from '@/lib/utils';
import { labelColorClasses } from '@/lib/labelColors';

interface CardLabelProps {
  label: Label;
  size?: 'compact' | 'full';
  onClick?: () => void;
}

export const CardLabel = ({ label, size = 'full', onClick }: CardLabelProps) => {
  const isHexColor = label.color.startsWith('#');
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded font-medium text-white cursor-pointer transition-all',
        !isHexColor && labelColorClasses[label.color],
        size === 'compact' ? 'h-2 w-10' : 'px-3 py-1 text-xs'
      )}
      style={isHexColor ? { backgroundColor: label.color } : undefined}
      title={label.name}
    >
      {size === 'full' && label.name}
    </div>
  );
};
