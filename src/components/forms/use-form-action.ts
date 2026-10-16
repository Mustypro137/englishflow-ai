"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import type { FormState } from "@/app/app/actions";

type ServerFormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Wraps a server action for a form. Submits inside a transition instead of via
 * <form action>, so React does not reset the fields when validation fails.
 */
export function useFormAction(serverAction: ServerFormAction) {
  const [state, dispatch, pending] = useActionState(serverAction, { status: "idle" } as FormState);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  }
  return { state, errors: state.errors ?? {}, pending, onSubmit };
}
