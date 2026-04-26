import { cn } from '../lib/utils';

const Card = ({ children, className, ...props }) => (
  <div
    className={cn('bg-card border border-cardBorder rounded-lg', className)}
    {...props}
  >
    {children}
  </div>
);

export default Card;
