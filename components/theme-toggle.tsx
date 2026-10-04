"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggle = () => {
    const root = document.documentElement
    const next = !root.classList.contains("dark")
    root.classList.add("theme-transition")
    root.classList.toggle("dark", next)
    window.setTimeout(() => root.classList.remove("theme-transition"), 300)
    try {
      localStorage.setItem("theme", next ? "dark" : "light")
    } catch {}
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
      className="relative inline-flex h-8 w-14 items-center rounded-full border border-slate-200 bg-slate-100 px-1 transition-colors hover:border-slate-300"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ${
          dark ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {dark ? <Moon className="h-3.5 w-3.5 text-indigo-600" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
      </span>
    </button>
  )
}
