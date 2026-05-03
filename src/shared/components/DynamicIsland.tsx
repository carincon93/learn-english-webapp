import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  toggleThemeWithTransition
} from '@carincon93/weird-ui'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function DynamicIsland({
  children
}: {
  children: React.ReactNode
}) {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : ''
  )
  const [routeAboutToChange, setRouteAboutToChange] = useState<boolean>(false)

  useEffect(() => {
    const handleRouteChange = (_: Event) => {
      setRouteAboutToChange(true)
    }

    const handleRouteChanged = () => {
      setRouteAboutToChange(false)
      setCurrentPath(window.location.pathname)
    }

    document.addEventListener('route-about-to-change', handleRouteChange)
    document.addEventListener('astro:page-load', handleRouteChanged)

    return () => {
      document.removeEventListener('route-about-to-change', handleRouteChange)
      document.removeEventListener('astro:page-load', handleRouteChanged)
    }
  }, [])

  const [isDark, setIsDark] = useState(
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true
  )

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    }
  }, [isDark])

  function toggleTheme(e: React.MouseEvent) {
    toggleThemeWithTransition(e, setIsDark)
  }

  return (
    <NavigationMenu
      stopColor1="#ff42a1ff"
      stopColor2="#ff9696ff"
      bloomBackgroundColor="#ff42a1ff"
      lastActiveItem={currentPath}
      routeAboutToChange={routeAboutToChange}
    >
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <a href="/" className="hover:bg-transparent">
              <strong className="text-sm">Weird</strong>{' '}
              <small className="bg-clip-text text-transparent bg-linear-to-br from-[#ff42a1] to-[#ff9696]">
                English
              </small>
            </a>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem data-link-href="/vocabulary">
          <NavigationMenuLink asChild>
            <a href="/vocabulary" className="">
              Vocabulary
            </a>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem
          className="hidden md:flex"
          data-link-href="/readings"
        >
          <NavigationMenuLink asChild>
            <a href="/readings" className="">
              Readings
            </a>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem data-link-href="/cards">
          <NavigationMenuLink asChild>
            <a
              href="/cards"
              className="rounded-full! px-8 py-2 bg-foreground! text-background! inline-flex items-center justify-center"
            >
              Cards
            </a>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem className="flex">
          <button onClick={toggleTheme}>{isDark ? <Sun /> : <Moon />}</button>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
