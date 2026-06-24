import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({ [source]: req[source] });
      const value = (parsed as Record<string, unknown>)[source];
      if (value !== undefined) {
        req[source] = value as typeof req[typeof source];
      }
      next();
    } catch (error: unknown) {
      const zodError = error as { errors?: unknown; message?: string };
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: zodError.errors || zodError.message,
      });
    }
  };
};
