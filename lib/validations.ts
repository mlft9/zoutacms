import { z } from "zod";

/**
 * Password policy: min 8 chars, at least one uppercase, one digit, one special char.
 */
export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  .regex(
    /[^A-Za-z0-9]/,
    "Le mot de passe doit contenir au moins un caractère spécial",
  );

export const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: passwordSchema,
  firstName: z.string().min(1, "Prénom requis").max(50).optional(),
  lastName: z.string().min(1, "Nom requis").max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  totpCode: z
    .string()
    .length(6, "Le code 2FA doit contenir 6 chiffres")
    .optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token requis"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email("Email invalide").optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const totpVerifySchema = z.object({
  code: z
    .string()
    .length(6, "Le code doit contenir 6 chiffres")
    .regex(/^\d+$/, "Le code doit être numérique"),
});

// Phase 2 — Admin
export const createClientSchema = z.object({
  email: z.string().email("Email invalide"),
  password: passwordSchema,
  firstName: z.string().min(1, "Prénom requis").max(50),
  lastName: z.string().min(1, "Nom requis").max(50),
});

export const updateClientSchema = z.object({
  email: z.string().email("Email invalide").optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

export const createServiceSchema = z.object({
  name: z.string().min(1, "Nom requis").max(100),
  type: z.enum(["VPS", "MINECRAFT"], { message: "Type invalide" }),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING", "TERMINATED"]).default("PENDING"),
  userId: z.string().min(1, "Client requis"),
  config: z.record(z.unknown()).default({}),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING", "TERMINATED"]).optional(),
  config: z.record(z.unknown()).optional(),
});

export const createNoteSchema = z.object({
  content: z.string().min(1, "Note requise").max(2000),
});
