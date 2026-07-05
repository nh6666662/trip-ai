"use client";

import * as React from "react";
import type { ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_DURATION = 4000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type State = { toasts: ToasterToast[] };

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function reducer(
  state: State,
  action: {
    type: "add" | "update" | "dismiss" | "remove";
    toast?: ToasterToast;
    toastId?: string;
  },
): State {
  switch (action.type) {
    case "add":
      return { toasts: [action.toast!, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "update":
      return {
        toasts: state.toasts.map((t) =>
          t.id === action.toast!.id ? { ...t, ...action.toast! } : t,
        ),
      };
    case "dismiss":
      return {
        toasts: state.toasts.map((t) =>
          t.id === action.toastId || action.toastId === undefined
            ? { ...t, open: false }
            : t,
        ),
      };
    case "remove":
      return {
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
}

function dispatch(action: Parameters<typeof reducer>[1]) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

type ToastOptions = Omit<ToasterToast, "id">;

function toast(options: ToastOptions) {
  const id = genId();
  const update = (props: ToasterToast) =>
    dispatch({ type: "update", toast: { ...props, id } });
  const dismiss = () => dispatch({ type: "dismiss", toastId: id });

  dispatch({
    type: "add",
    toast: {
      ...options,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
      duration: options.duration ?? TOAST_DURATION,
    },
  });

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "dismiss", toastId }),
  };
}

export { useToast, toast };
export type { ToasterToast };
