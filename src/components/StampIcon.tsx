import type { StampId } from "../game/stamps";

interface StampIconProps {
  id: StampId;
  className?: string;
}

export function StampIcon({ id, className = "w-7 h-7" }: StampIconProps) {
  switch (id) {
    case "acorn":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 5c0 2.5 1.5 3.5 1.5 3.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M7.5 13.5C7.5 9.5 11.3 8 16 8s8.5 1.5 8.5 5.5H7.5Z"
            fill="currentColor"
            fillOpacity="0.88"
          />
          <path
            d="M9.5 13.5h13v3.8c0 4.6-2.9 8.2-6.5 9.4-3.6-1.2-6.5-4.8-6.5-9.4v-3.8Z"
            fill="currentColor"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case "fox":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M7 7l5 5h8l5-5v9.5c0 4.5-4 8.5-9 9.5-5-1-9-5-9-9.5V7Z"
            fill="currentColor"
            fillOpacity="0.24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M7 16.5l9 9.5 9-9.5-4.5 1.5L16 21l-4.5-3L7 16.5Z"
            fill="currentColor"
            fillOpacity="0.55"
          />
          <circle cx="12.5" cy="15.5" r="1.3" fill="currentColor" />
          <circle cx="19.5" cy="15.5" r="1.3" fill="currentColor" />
          <circle cx="16" cy="21" r="1.5" fill="currentColor" />
        </svg>
      );
    case "crane":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M5 17l11-4 11-5-5 10-7 2-5-2-5-1Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M11 15l5-9 3 8"
            fill="currentColor"
            fillOpacity="0.45"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M15 20l-4 5 9-3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "moon":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M21.8 19.6A8.6 8.6 0 0 1 12.4 7a8.8 8.8 0 1 0 12.5 11.4 8.6 8.6 0 0 1-3.1 1.2Z"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M22 7.5v3M20.5 9h3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "boat":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 7l7 11H9l7-11Z"
            fill="currentColor"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 18h21l-3.2 5.5H8.7L5.5 18Z"
            fill="currentColor"
            fillOpacity="0.55"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M6 26.2c2.5 1 4.5-1 7 0s4.5 1 7 0 4-.8 6 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "pine":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 5l6 8h-3.5l5 7H19l4.5 5H8.5L13 20H8.5l5-7H10l6-8Z"
            fill="currentColor"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M16 25v3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "sun":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <circle
            cx="16"
            cy="16"
            r="5.5"
            fill="currentColor"
            fillOpacity="0.35"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16 5v3M16 24v3M5 16h3M24 16h3M8.2 8.2l2.2 2.2M21.6 21.6l2.2 2.2M23.8 8.2l-2.2 2.2M10.4 21.6l-2.2 2.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "ladybug":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path d="M12.5 10.5a3.5 3.5 0 0 1 7 0" fill="currentColor" />
          <ellipse
            cx="16"
            cy="18"
            rx="7.5"
            ry="8"
            fill="currentColor"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16 10v16M9 14l-2.5-1.5M23 14l2.5-1.5M8.5 19H6M23.5 19H26"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12.5" cy="16" r="1.2" fill="currentColor" />
          <circle cx="19.5" cy="16" r="1.2" fill="currentColor" />
          <circle cx="13" cy="21" r="1.2" fill="currentColor" />
          <circle cx="19" cy="21" r="1.2" fill="currentColor" />
        </svg>
      );
    case "teacup":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M7 14h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-5Z"
            fill="currentColor"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M21 15.5h2.2a2.5 2.5 0 0 1 0 5H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M11.5 10.5c0-1.5 1-2 1-3.5M16 10.5c0-1.5 1-2 1-3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "mushroom":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M6.5 16.5C6.5 10.8 10.8 7 16 7s9.5 3.8 9.5 9.5h-19Z"
            fill="currentColor"
            fillOpacity="0.34"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12.5 16.5v6.2a2.3 2.3 0 0 0 2.3 2.3h2.4a2.3 2.3 0 0 0 2.3-2.3v-6.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="13" cy="12" r="1.3" fill="currentColor" />
          <circle cx="18.5" cy="13" r="1.1" fill="currentColor" />
        </svg>
      );
    case "kite":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 5l8 9-8 10-8-10 8-9Z"
            fill="currentColor"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M16 5v19M8 14h16" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M16 24c0 2.5 2.5 2 3 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "starlight":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 5l2.8 7.2L26 15l-7.2 2.8L16 25l-2.8-7.2L6 15l7.2-2.8L16 5Z"
            fill="currentColor"
            fillOpacity="0.32"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="8" r="1.3" fill="currentColor" />
          <circle cx="8" cy="23" r="1.1" fill="currentColor" />
        </svg>
      );
  }
}
