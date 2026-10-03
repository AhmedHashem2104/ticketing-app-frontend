import { Children, cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

/** Components that accept `<Field>`'s id and ARIA wiring (marked with `fieldControl = true`). */
type MarkedComponent = { fieldControl?: boolean };

const HOST_CONTROLS = new Set(["input", "select", "textarea"]);

const isControl = (element: ReactElement) =>
  typeof element.type === "string" ? HOST_CONTROLS.has(element.type) : (element.type as MarkedComponent).fieldControl === true;

/**
 * Gives the first form control inside `children` the field's id and ARIA attributes, looking through
 * wrapping elements and fragments (e.g. a `+20` prefix next to a phone input). Props already set on the
 * control win. Done with props rather than React context, so each field's wiring stays local.
 */
export function wireFieldControl(children: ReactNode, control: FieldControlProps): ReactNode {
  let wired = false;
  const visit = (node: ReactNode): ReactNode =>
    Children.map(node, (child) => {
      if (wired || !isValidElement<{ children?: ReactNode }>(child)) return child;
      if (isControl(child)) {
        wired = true;
        return cloneElement(child as ReactElement<Record<string, unknown>>, { ...control, ...(child.props as Record<string, unknown>) });
      }
      if (typeof child.type === "string" || child.type === Fragment) {
        const nested = child.props.children;
        return nested === undefined ? child : cloneElement(child, undefined, visit(nested));
      }
      return child;
    });
  const result = visit(children);
  return Children.count(children) === 1 && Array.isArray(result) && result.length === 1 ? result[0] : result;
}

/** Marks a component as a form control `<Field>` can wire up. */
export function markFieldControl<C extends object>(component: C): C {
  (component as MarkedComponent).fieldControl = true;
  return component;
}
