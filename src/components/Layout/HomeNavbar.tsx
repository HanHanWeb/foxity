"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function HomeNavbar() {
  const router = useRouter();
  const { user } = useAuth(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/auth");
    router.refresh();
  };

  type NavItem =
    | { label: string; href: string; variant: "primary" | "secondary" }
    | { label: string; onClick: () => void | Promise<void>; variant: "muted" };

  const navItems: NavItem[] = [
    { label: "开始测评", href: "/team/create", variant: "primary" },
    ...(user
      ? [
          { label: "控制台", href: "/dashboard", variant: "secondary" as const },
          { label: "退出", onClick: handleLogout, variant: "muted" as const },
        ]
      : []),
  ];

  const getItemClassName = (variant: NavItem["variant"], mobile = false) =>
    cn(
      "rounded-full text-sm font-semibold transition-colors",
      mobile ? "flex w-full items-center justify-center px-4 py-3" : "px-4 py-2",
      variant === "primary" && "bg-fox-navy text-white hover:bg-fox-navy/90",
      variant === "secondary" && "text-fox-navy hover:bg-fox-cream",
      variant === "muted" && "text-fox-gray hover:bg-fox-cream hover:text-fox-navy"
    );

  const renderNavItem = (item: NavItem, mobile = false) => {
    const className = getItemClassName(item.variant, mobile);

    if ("href" in item) {
      const link = (
        <Link href={item.href} className={className}>
          {item.label}
        </Link>
      );

      return mobile ? (
        <SheetClose asChild key={item.label}>
          {link}
        </SheetClose>
      ) : (
        <span key={item.label}>{link}</span>
      );
    }

    const button = (
      <button type="button" onClick={item.onClick} className={className}>
        {item.label}
      </button>
    );

    return mobile ? (
      <SheetClose asChild key={item.label}>
        {button}
      </SheetClose>
    ) : (
      <span key={item.label}>{button}</span>
    );
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-fox-gray-light/60 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <img src="/fox.png" alt="Foxity" width={36} height={36} className="rounded-lg" />
          <span className="text-base font-bold text-fox-navy">Foxity</span>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">{navItems.map((item) => renderNavItem(item))}</div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-fox-navy transition-colors hover:bg-fox-cream sm:hidden"
              aria-label="打开导航菜单"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] bg-white">
            <SheetHeader>
              <SheetTitle className="text-left text-fox-navy">Foxity</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-3 px-4">{navItems.map((item) => renderNavItem(item, true))}</nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
