import { SVGProps } from "react";

export function SymbioteLogo(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="512"
            height="512"
            viewBox="0 0 100 100"
            {...props}
        >
            <title>SymbioteGG</title>
            <g transform="translate(50 50) rotate(-35) scale(1.173) translate(0 11.500)">
                <path
                    d="M-19.112 19.071 A35.800 35.800 0 1 1 19.112 19.071 A27.000 27.000 0 1 0 -19.112 19.071 Z"
                    fill="#f59a3d"
                />
                <circle cx="0" cy="0" r="24" fill="#7733ff" />
            </g>
        </svg>
    );
}
