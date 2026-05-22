interface ToastProps {
  toast: { msg: string; type: string } | null;
}

export default function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  const isError = toast.type === "error";
  const isSuccess = toast.type === "success";

  return (
    <div
      className={`toast-enter fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${
        isError
          ? "bg-red-500 text-white"
          : isSuccess
            ? "bg-emerald-500 text-white"
            : "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
      }`}
    >
      {toast.msg}
    </div>
  );
}
