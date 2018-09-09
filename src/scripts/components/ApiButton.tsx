import * as React from "react";
import { api } from "../apis";

interface Props {
  url: string;
  method?: "GET" | "POST" | "PUT";
  formData?: any;
  data?: any;
  body?: any;
}

export const ApiButton: React.StatelessComponent<Props> = ({
  url,
  method = "POST",
  formData,
  data,
  body,
  children,
}) => (
  <button onClick={() => api.exec({ url, method, formData, data, body })}>
    {children}
  </button>
);
