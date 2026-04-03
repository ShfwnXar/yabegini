export const ENV = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "",
  USE_MOCK:
    (process.env.NEXT_PUBLIC_USE_MOCK ||
      (process.env.NEXT_PUBLIC_API_BASE_URL ? "false" : "true")) === "true",
}
