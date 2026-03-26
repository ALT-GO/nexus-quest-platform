import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({ name, avatarUrl, className, fallbackClassName }: UserAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name || "Avatar"} />}
      <AvatarFallback className={cn("bg-primary/10 text-primary text-xs font-medium", fallbackClassName)}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
