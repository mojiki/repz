"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-3 inline-block text-sm text-muted">
      ← {label}
    </Link>
  );
}

export function SubmitButton({
  children,
  className = "btn btn-primary w-full",
  confirm,
}: {
  children: React.ReactNode;
  className?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-50`}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}

/** サーバーアクションを bind して渡す用の小さな削除ボタン */
export function DangerButton({
  action,
  confirm,
  children = "削除",
  className = "btn btn-sm btn-ghost text-bad",
}: {
  action: () => Promise<void>;
  confirm?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <form action={action}>
      <SubmitButton className={className} confirm={confirm}>
        {children}
      </SubmitButton>
    </form>
  );
}
