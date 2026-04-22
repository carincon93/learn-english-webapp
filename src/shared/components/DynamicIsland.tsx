import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, NavigationMenuListItem } from "@carincon93/weird-ui";

export default function DynamicIsland({ children }: { children: React.ReactNode }) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <NavigationMenu stopColor1="#ff42a1ff" stopColor2="#ff9696ff" lastActiveItem={currentPath}>
            <NavigationMenuList>
                <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                        <a href="/" className="flex items-center justify-center flex-col !gap-0 hover:bg-transparent">
                            <strong className="text-sm">Weird</strong> <small className="bg-clip-text text-transparent bg-gradient-to-br from-purple-400 to-pink-600">English</small>
                        </a>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem data-link-href="/words">
                    <NavigationMenuLink asChild>
                        <a href="/words" className="">Words</a>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem className="hidden md:flex" data-link-href="/readings">
                    <NavigationMenuLink asChild>
                        <a href="/readings" className="">Readings</a>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                        <a href="/" className="!rounded-full px-8 py-2 !bg-background !text-foreground inline-flex items-center justify-center">Docs</a>
                    </NavigationMenuLink>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    );
}