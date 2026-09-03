"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CODE_LENGTH = 6;

interface JoinTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinTeamDialog({ open, onOpenChange }: JoinTeamDialogProps) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/[^A-Za-z0-9]/g, "").slice(-1).toUpperCase();
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = next.join("");
    if (code.length === CODE_LENGTH && !next.includes("")) {
      setTimeout(() => {
        router.push(`/team/${code}/join`);
        onOpenChange(false);
      }, 300);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, CODE_LENGTH);
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    if (pasted.length === CODE_LENGTH) {
      setTimeout(() => {
        router.push(`/team/${pasted}/join`);
        onOpenChange(false);
      }, 300);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>加入团队</DialogTitle>
          <DialogDescription>输入 6 位团队邀请码，加入你的团队开始测评。</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-2 py-4" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="h-14 w-12 rounded-full border-2 border-[#d9dee8] bg-white text-center text-2xl font-bold text-[#425a7a] outline-none transition-all focus:border-[#425a7a] focus:ring-2 focus:ring-[#425a7a]/15"
            />
          ))}
        </div>
        <p className="text-center text-xs text-fox-gray">输入完成后将自动加入团队</p>
      </DialogContent>
    </Dialog>
  );
}
