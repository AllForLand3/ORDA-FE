export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  status: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  traceId?: string;
}
