"use client";

import { InputHTMLAttributes } from "react";

type NumberInputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

/** Voorkomt dat scrollen de waarde van number-inputs wijzigt; pagina scrollt wel door. */
export function NumberInput({ className = "", hasError = false, onWheel, ...props }: NumberInputProps) {
  return (
    <input
      type="number"
      {...props}
      className={`${className} ${hasError ? "border-red-500 ring-1 ring-red-400" : ""}`.trim()}
      onWheel={(event) => {
        event.currentTarget.blur();
        onWheel?.(event);
      }}
    />
  );
}
