import { cn } from "@/lib/utils";

export interface AuthFormFieldProps {
  id: string;
  label?: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  className?: string;
}

export function AuthFormField({
  id,
  label,
  type = "text",
  placeholder,
  className,
}: AuthFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

export default AuthFormField;
