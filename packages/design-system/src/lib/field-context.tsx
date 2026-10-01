import { createContext, useContext } from "react";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

/** Set by `<Field>` so nested controls pick up their id and ARIA wiring automatically. */
export const FieldContext = createContext<FieldControlProps | null>(null);

export const useFieldControl = () => useContext(FieldContext);
