"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Video,
  MessageSquare,
  User,
  LogOut,
  Menu,
  X,
  IndianRupeeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { UserButton, useAuth } from "@clerk/nextjs";

const protectedNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Generate", href: "/generate", icon: Video },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Subscription", href: "/subscription", icon: IndianRupeeIcon },
];

const publicNavItem = [
  { name: "Home", href: "/", icon: LayoutDashboard },
];

const Navbar = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { userId, getToken } = useAuth();

  return (
    <header className="fixed top-0 left-0 w-full z-50">
      <div className="mx-auto max-w-7xl px-4">
        <nav className="mt-4 rounded-2xl glass-card px-4 py-3 flex items-center justify-between">
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold">
              🧠
            </div>
            <span className="font-semibold text-lg text-foreground">
              NeuroVid AI
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-2">
            {userId ? (
              <>
                {protectedNavItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition",
                        active
                          ? "bg-violet-500/20 text-violet-400"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </>
            ) : (
              <Link
                href="/"
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition",
                  pathname === "/" ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Home
              </Link>
            )}
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </Button>

           <div>
            {!userId ? (
              <Link href="/sign-in">
                <Button variant="outline">Login</Button>
              </Link>
            ) : (
              <UserButton />
            )}
           </div>
          </div>
        </nav>

        {/* MOBILE MENU */}
        {open && (
          <div className="md:hidden mt-2 rounded-2xl glass-card p-3 space-y-1">
            {userId ? (
              <>
                {protectedNavItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition",
                        active
                          ? "bg-violet-500/20 text-violet-400"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </>
            ) : (
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition",
                  pathname === "/" ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <LayoutDashboard className="w-5 h-5" />
                Home
              </Link>
            )}

            {!userId ? (
              <Link href="/sign-in" className="w-full">
                <Button variant="outline" className="w-full justify-start">
                  Login
                </Button>
              </Link>
            ) : (
              <div className="w-full flex items-center gap-2">
                <UserButton />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive mt-2"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
