import { deleteSession } from "@/app/actions";
import { DangerButton } from "@/components/ui";

export function DeleteSessionButton({ sessionId }: { sessionId: number }) {
  return (
    <DangerButton
      action={deleteSession.bind(null, sessionId)}
      confirm="この日のセッションを丸ごと削除しますか?"
      className="btn btn-sm btn-ghost text-bad w-full"
    >
      このセッションを削除
    </DangerButton>
  );
}
