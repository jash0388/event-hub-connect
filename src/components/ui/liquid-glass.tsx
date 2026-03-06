"use client";

import React from "react";
import {
    Search,
    Mail,
    MessageCircle,
    MapPin,
    Globe,
    Gamepad2,
    Settings,
    User,
    Calendar,
    FileText,
    Home,
    Zap,
    Code,
    Database,
    Server,
    Cloud,
    Terminal,
    Bug,
    Cpu,
    HardDrive,
    Wifi,
    Camera,
    Music,
    Video,
    Image,
    File,
    Folder,
    Download,
    Upload,
    Share2,
    Link,
    Lock,
    Unlock,
    Key,
    Eye,
    EyeOff,
    Bell,
    Clock,
    Compass,
    Navigation,
    Flag,
    Tag,
    Bookmark,
    Heart,
    Star,
    ThumbsUp,
    ThumbsDown,
    Smile,
    Frown,
    Meh,
    Laugh,
    Angry,
    Coffee,
    UtensilsCrossed,
    ShoppingBag,
    CreditCard,
    Wallet,
    Building,
    School,
    Briefcase,
    GraduationCap,
    Award,
    Trophy,
    Medal,
    Crown,
    Gem,
    Sparkles,
    Flame,
    CloudRain,
    Sun,
    Moon,
    Stars,
    Rainbow,
    Umbrella,
    Feather,
    Leaf,
    TreeDeciduous,
    Flower2,
    Droplets,
    Waves,
    Skull,
    Ghost,
    Bot,
    Bird,
    Fish,
    PawPrint,
    Rabbit,
    Cat,
    Dog,
    Wheat,
    Apple,
    Banana,
    Cherry,
    Grape,
    Carrot,
    Pizza,
    IceCream,
    Cake,
    Cookie,
    GlassWater,
    Beer,
    Wine,
    Utensils,
    Drumstick,
    Egg,
    Milk
} from "lucide-react";

// Types
interface GlassEffectProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    href?: string;
    target?: string;
}

interface DockIcon {
    icon: React.ReactNode;
    alt: string;
    onClick?: () => void;
    href?: string;
}

// Glass Effect Wrapper Component
const GlassEffect: React.FC<GlassEffectProps> = ({
    children,
    className = "",
    style = {},
    href,
    target = "_blank",
}) => {
    const glassStyle = {
        boxShadow: "0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)",
        transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
        ...style,
    };

    const content = (
        <div
            className={`relative flex font-semibold overflow-hidden text-black cursor-pointer transition-all duration-700 ${className}`}
            style={glassStyle}
        >
            {/* Glass Layers */}
            <div
                className="absolute inset-0 z-0 overflow-hidden rounded-inherit rounded-3xl"
                style={{
                    backdropFilter: "blur(3px)",
                    filter: "url(#glass-distortion)",
                    isolation: "isolate",
                }}
            />
            <div
                className="absolute inset-0 z-10 rounded-inherit"
                style={{ background: "rgba(255, 255, 255, 0.25)" }}
            />
            <div
                className="absolute inset-0 z-20 rounded-inherit rounded-3xl overflow-hidden"
                style={{
                    boxShadow:
                        "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5)",
                }}
            />

            {/* Content */}
            <div className="relative z-30">{children}</div>
        </div>
    );

    return href ? (
        <a href={href} target={target} rel="noopener noreferrer" className="block">
            {content}
        </a>
    ) : (
        content
    );
};

// Dock Component
const GlassDock: React.FC<{ icons: DockIcon[]; href?: string }> = ({
    icons,
    href,
}) => (
    <GlassEffect
        href={href}
        className="rounded-3xl p-3 hover:p-4 hover:rounded-[2.5rem]"
    >
        <div className="flex items-center justify-center gap-2 rounded-3xl p-3 py-0 px-0.5 overflow-hidden">
            {icons.map((icon, index) => (
                <div
                    key={index}
                    className="w-16 h-16 flex items-center justify-center transition-all duration-700 hover:scale-110 cursor-pointer"
                    style={{
                        transformOrigin: "center center",
                        transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
                    }}
                    onClick={icon.onClick}
                >
                    {icon.icon}
                </div>
            ))}
        </div>
    </GlassEffect>
);

// Button Component
const GlassButton: React.FC<{ children: React.ReactNode; href?: string }> = ({
    children,
    href,
}) => (
    <GlassEffect
        href={href}
        className="rounded-3xl px-10 py-6 hover:px-11 hover:py-7 hover:rounded-[2.5rem] overflow-hidden"
    >
        <div
            className="transition-all duration-700 hover:scale-95"
            style={{
                transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
            }}
        >
            {children}
        </div>
    </GlassEffect>
);

// SVG Filter Component
const GlassFilter: React.FC = () => (
    <svg style={{ display: "none" }}>
        <filter
            id="glass-distortion"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            filterUnits="objectBoundingBox"
        >
            <feTurbulence
                type="fractalNoise"
                baseFrequency="0.001 0.005"
                numOctaves="1"
                seed="17"
                result="turbulence"
            />
            <feComponentTransfer in="turbulence" result="mapped">
                <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
                <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
                <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
            </feComponentTransfer>
            <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
            <feSpecularLighting
                in="softMap"
                surfaceScale="5"
                specularConstant="1"
                specularExponent="100"
                lightingColor="white"
                result="specLight"
            >
                <fePointLight x="-200" y="-200" z="300" />
            </feSpecularLighting>
            <feComposite
                in="specLight"
                operator="arithmetic"
                k1="0"
                k2="1"
                k3="1"
                k4="0"
                result="litImage"
            />
            <feDisplacementMap
                in="SourceGraphic"
                in2="softMap"
                scale="200"
                xChannelSelector="R"
                yChannelSelector="G"
            />
        </filter>
    </svg>
);

// Main Component
export const LiquidGlass: React.FC = () => {
    const dockIcons: DockIcon[] = [
        { icon: <Search className="w-10 h-10 text-white" />, alt: "Search", href: "/events" },
        { icon: <Calendar className="w-10 h-10 text-white" />, alt: "Events", href: "/events" },
        { icon: <MessageCircle className="w-10 h-10 text-white" />, alt: "Chat", href: "/feed" },
        { icon: <MapPin className="w-10 h-10 text-white" />, alt: "Location", href: "/contact" },
        { icon: <Globe className="w-10 h-10 text-white" />, alt: "Web", href: "/" },
        { icon: <Gamepad2 className="w-10 h-10 text-white" />, alt: "Games", href: "/projects" },
    ];

    return (
        <div
            className="min-h-screen h-full flex items-center justify-center font-light relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(to bottom, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)',
            }}
        >
            <GlassFilter />

            <div className="flex flex-col gap-6 items-center justify-center w-full">
                <GlassDock icons={dockIcons} href="https://x.com" />

                <GlassButton href="https://x.com">
                    <div className="text-xl text-white">
                        <p>How can i help you today?</p>
                    </div>
                </GlassButton>
            </div>
        </div>
    );
}

export default LiquidGlass;
