import { z } from "zod";

/**
 * Kanonisk JSON for vellykket POST /api/paper-trading/execute.
 * Brudd her gir 500 i route — forhindrer at UI deployes uten session_id / trade_id.
 */
export const paperExecuteSuccessResponseSchema = z.object({
  success: z.literal(true),
  trade_id: z.string().uuid(),
  session_id: z.string().uuid(),
  new_balance: z.number().finite(),
});

export type PaperExecuteSuccessResponse = z.infer<
  typeof paperExecuteSuccessResponseSchema
>;
