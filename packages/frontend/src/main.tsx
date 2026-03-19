import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import "@/styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

ReactDOM.createRoot(rootElement).render(
  <AppProviders>
    <RouterProvider router={router} />
  </AppProviders>,
);
