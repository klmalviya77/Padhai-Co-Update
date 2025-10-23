import { z } from 'zod';

// Upload form validation
export const uploadSchema = z.object({
  category: z.enum(['programming', 'school', 'university'], {
    errorMap: () => ({ message: "Please select a valid category" })
  }),
  level: z.string()
    .trim()
    .min(1, "Level/Class/Semester is required")
    .max(50, "Level must be less than 50 characters"),
  subject: z.string()
    .trim()
    .min(1, "Subject is required")
    .max(100, "Subject must be less than 100 characters"),
  topic: z.string()
    .trim()
    .min(1, "Topic is required")
    .max(200, "Topic must be less than 200 characters"),
  tags: z.string()
    .max(500, "Tags must be less than 500 characters")
    .transform(s => 
      s.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .slice(0, 10)
    ),
  file: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, "File size must be less than 10MB")
    .refine(
      file => ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
      "File must be a PDF or image (JPG, PNG, GIF, WEBP)"
    )
});

// Auth form validation with strong password policy
export const authSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be less than 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./~`]/, "Password must contain at least one symbol (!@#$%^&*()_+-=[]{};':\"\\|<>?,./~`)"),
  fullName: z.string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name must be less than 100 characters")
    .optional(),
  university: z.string()
    .trim()
    .max(200, "University name must be less than 200 characters")
    .optional(),
  course: z.string()
    .trim()
    .max(100, "Course name must be less than 100 characters")
    .optional()
});

// Report form validation
export const reportSchema = z.object({
  reason: z.string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(1000, "Reason must be less than 1000 characters")
});

// Request note creation validation
export const requestNoteSchema = z.object({
  category: z.enum(['programming', 'school', 'university']),
  level: z.string().trim().min(1).max(50),
  subject: z.string().trim().min(1, "Subject is required").max(100),
  topic: z.string().trim().min(1, "Topic is required").max(200),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(1000),
  pointsOffered: z.number().int().min(5, "Points must be at least 5").max(100, "Points must be at most 100")
});

// Fulfillment upload validation
export const fulfillmentUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size >= 200 * 1024, "File must be at least 200KB")
    .refine(f => f.size <= 10 * 1024 * 1024, "File must be less than 10MB")
    .refine(f => f.type === 'application/pdf', "Only PDF files are allowed")
});

// Profile update validation (all fields optional)
export const profileUpdateSchema = z.object({
  full_name: z.string().trim().max(100, "Name must be less than 100 characters").optional(),
  university: z.string().trim().max(200, "University name must be less than 200 characters").optional(),
  course: z.string().trim().max(100, "Course name must be less than 100 characters").optional()
});

// Types for validated data
export type UploadFormData = z.infer<typeof uploadSchema>;
export type AuthFormData = z.infer<typeof authSchema>;
export type ReportFormData = z.infer<typeof reportSchema>;
export type RequestNoteFormData = z.infer<typeof requestNoteSchema>;
export type FulfillmentUploadFormData = z.infer<typeof fulfillmentUploadSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
