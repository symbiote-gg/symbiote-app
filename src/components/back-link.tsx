import { ChevronLeft } from "lucide-react";

import { ButtonLink } from "@/ui";

export interface BackLinkProps {
    href: string;
    label: string;
    className?: string;
}

export function BackLink({ href, label, className }: BackLinkProps) {
    return (
        <ButtonLink
            href={href}
            variant="secondary"
            size="sm"
            arrow={false}
            className={className}
        >
            <ChevronLeft />
            {label}
        </ButtonLink>
    );
}
