"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/ui/button";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean(), // obligatorisk for å matche TS-typen
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      // kall API / autentisering her
      console.info("Login data:", data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="login-email">Email</label>
        <input id="login-email" {...register("email")} />
        {errors.email && <p>{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" {...register("password")} />
        {errors.password && <p>{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="login-remember">
          <input id="login-remember" type="checkbox" {...register("rememberMe")} />
          Remember me
        </label>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Logger inn..." : "Logg inn"}
      </Button>
    </form>
  );
}
